# Backend transcendence

## Role in the project

The backend handles all server-side logic, authentication, data storage, real-time communication, and OAuth. It runs two servers inside the same Docker container:

- **Django + Daphne** on port `8000` (REST API + WebSocket)
- **Node.js** on port `3000` (OAuth 42 callback only)

```
backend/
├── Dockerfile
├── requirements.txt          — Python dependencies
├── package.json              — Node.js dependencies
├── server.js                 — Node.js OAuth callback server
├── scripts/entrypoint.sh     — startup script (migrations, superuser, launch)
└── src/
    ├── manage.py             — Django entry point
    ├── transcendance/
    │   ├── settings.py       — Django configuration
    │   ├── urls.py           — main URL router
    │   └── asgi.py           — ASGI config (HTTP + WebSocket)
    ├── users/                — auth, profiles, friends, OAuth
    ├── game/                 — online game rooms, matchmaking, WebSocket loop
    └── chat/                 — global chat WebSocket
```

---

## Architecture overview

```
Browser
   │
   │ HTTPS / WSS
   ▼
Nginx :8443
   ├── /api/    ──────────────────────────► Django :8000
   ├── /ws/     ──── WebSocket upgrade ───► Daphne :8000 ──► Django Channels
   └── /accounts/ ───────────────────────► Node.js :3000
                                                │
                                         api.intra.42.fr

Django :8000
   ├── REST API (users, game, chat views)
   ├── Django ORM ────────────────────────► PostgreSQL :5432
   └── Django Channels ───────────────────► Redis :6379 (channel layer)
```

---

## How Django handles a request

### REST API request (HTTP)
```
Browser GET /api/users/me/
   │
   ▼
Nginx → proxy_pass http://backend:8000
   │
   ▼
Daphne (ASGI server)
   │
   ▼
Django router (transcendance/urls.py)
   │  matches api/users/
   ▼
users/urls.py
   │  matches me/
   ▼
users/views.py → get_user_profile()
   │
   ├── UserProfile.objects.get(user=request.user)   ← Django ORM
   │         │
   │         ▼
   │    PostgreSQL query: SELECT * FROM users_userprofile WHERE user_id = X
   │
   └── return JsonResponse({ username, avatar, wins, ... })
```

### WebSocket request (game)
```
Browser → wss://localhost:8443/ws/game/room_42/
   │
   ▼
Nginx → proxy WebSocket to http://backend:8000
   │
   ▼
Daphne (handles async WebSocket)
   │
   ▼
Django Channels router (game/routing.py)
   │  matches ws/game/<room_id>/
   ▼
game/consumers.py → GameConsumer
   │
   ├── connect()    → join Redis channel group "game_room_42"
   ├── receive()    → process player input
   ├── game_loop()  → runs 60 tick/s, sends state to all players
   │         │
   │         ▼
   │    Redis channel layer
   │    group_send("game_room_42", { ball, p1, p2, score })
   │
   └── disconnect() → leave group, clean up room
```

---

## Django apps

### `users/` - Users, auth, friends, OAuth

| File | Role |
|------|------|
| `models.py` | `UserProfile` model (wins, losses, xp, avatar, paddle_color, ai_difficulty, is_online) |
| `views.py` | REST API: login, register, logout, profile, friends, leaderboard, avatar upload, GDPR |
| `urls.py` | Maps every `/api/users/` URL to its view |
| `signals.py` | Auto-creates a `UserProfile` whenever a `User` is created |
| `admin.py` | Registers `UserProfile` in Django admin (edit/delete from the portal) |
| `providers/fortytwo/` | OAuth 42: exchanges code for token, fetches login + avatar from 42 API |

**Avatar logic** - `get_avatar_url(profile, request)`:
```
profile.avatar (uploaded file)  → return /media/avatars/filename.jpg
    ↓ (empty)
profile.avatar_url (OAuth URL)  → return https://cdn.intra.42.fr/...
    ↓ (empty)
default                         → return /Mokoko.webp
```

---

### `game/` - Online multiplayer

| File | Role |
|------|------|
| `consumers.py` | WebSocket game loop (matchmaking, 60 tick/s server-side physics) |
| `views.py` | REST: create room, list active rooms |
| `models.py` | `MatchmakingQueue` (username, room_id, created_at) |
| `routing.py` | WebSocket route: `ws/game/<room_id>/` |
| `urls.py` | HTTP routes: `/api/game/create/`, `/api/game/rooms/` |

**Game loop** in `consumers.py`:
```
Player connects → added to matchmaking queue
Two players in queue → room created, game starts
  │
  ▼ every 1/60s:
  receive input   → update paddle position
  compute ball    → check collisions, bounces, scoring
  broadcast state → group_send to both players + spectators
  │
  ▼ score reaches 5:
  send game_over → record match in DB → disconnect
```

---

### `chat/` - Global real-time chat

| File | Role |
|------|------|
| `consumers.py` | WebSocket: receive message → save to DB → broadcast to group |
| `models.py` | `Message` (user FK, content, timestamp) |
| `views.py` | REST: GET `/api/chat/history/` → returns last 50 messages |
| `routing.py` | WebSocket route: `ws/chat/` |

---

### `transcendance/` - Django configuration

| File | Role |
|------|------|
| `settings.py` | Database, installed apps, CORS, CHANNEL_LAYERS (Redis), MEDIA_ROOT |
| `urls.py` | Main router: includes `users/urls.py`, `game/urls.py`, `chat/urls.py` |
| `asgi.py` | ASGI config: routes HTTP to Django, WebSocket to Django Channels |

**CHANNEL_LAYERS config** (Redis):
```PY
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": { "hosts": [("redis", 6379)] }
    }
}
```

---

### `server.js` - Node.js OAuth 42 callback

Receives the OAuth callback from the 42 intranet and creates/updates the Django user.

```
42 intranet → GET /accounts/fortytwo/login/callback/?code=XYZ
   │
   ▼
Node.js :3000
   │
   ├── POST to 42 API: exchange code → access_token
   ├── GET  from 42 API: fetch user { login, image.link }
   ├── POST to Django /api/users/oauth-login/: create or update user
   │
   └── redirect browser to /?username=tmilin&avatar=https://...
```

---

## Docker setup

### Dockerfile
```dockerfile
FROM debian:bookworm
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    postgresql-client \
    libpq-dev gcc \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt
COPY package*.json ./
RUN npm install
COPY . .
COPY ./scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
EXPOSE 8000
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
```

### entrypoint.sh
```bash

#!/bin/bash

set -e

echo "start script were is in entrypoint.sh"
echo "Etape 0: lancement du server"
node server.js &
echo "ETAPE 1: Attente de PostgreSQL..."
until c_out=$(python3 -c "import psycopg2; psycopg2.connect(dbname='$POSTGRES_DB', user='$POSTGRES_USER', password='$POSTGRES_PASSWORD', host='db')" 2>/dev/null); do
  sleep 1
done
echo "ETAPE 2: PostgreSQL est pret les gars"
cd src
echo "ETAPE 3 & 4: Migrations"
python3 manage.py makemigrations --noinput
python3 manage.py migrate --noinput
echo "ETAPE 4: Application des migrations..."
python3 manage.py migrate --noinput
echo "EATEPE 5: Verification du Superuser..."
python3 manage.py createsuperuser --noinput || echo "Superuser deja la."
echo "ETAPE 6: Collecte des fichiers statiques"
python3 manage.py collectstatic --noinput --clear
chmod -R 755 /app/staticfiles
echo " entrypoint.sh done / Lancement de Daphne"
exec daphne -b 0.0.0.0 -p 8000 transcendance.asgi:application
```

---

## PostgreSQL - database commands

### Connect to the database
```bash
# Enter the PostgreSQL container directly
docker compose exec db psql -U db_user -d transcendence_db

# Or from inside the backend container
docker compose exec backend bash
python3 src/manage.py dbshell
```

### Navigate the database (inside psql)
```bash
# List all tables
\dt

# List all tables with size info
\dt+

# Describe the structure of a table (columns, types, constraints)
\d users_userprofile
\d users_friendrequest
\d auth_user
\d chat_message
\d game_matchmakingqueue

# Quit psql
\q
```

### Query the data
```bash
# View all users
SELECT id, username, email, is_active, date_joined FROM auth_user;

# View all user profiles
SELECT id, user_id, wins, losses, xp, paddle_color, ai_difficulty, is_online
FROM users_userprofile;

# View a specific user's profile
SELECT u.username, p.wins, p.losses, p.xp, p.paddle_color
FROM auth_user u
JOIN users_userprofile p ON p.user_id = u.id
WHERE u.username = 'tmilin';

# View all friend requests
SELECT id, sender_id, receiver_id, status, created_at FROM users_friendrequest;

# View accepted friendships
SELECT sender_id, receiver_id FROM users_friendrequest WHERE status = 'accepted';

# View chat messages (most recent first)
SELECT u.username, m.content, m.timestamp
FROM chat_message m
JOIN auth_user u ON m.user_id = u.id
ORDER BY m.timestamp DESC LIMIT 20;

# View matchmaking queue
SELECT * FROM game_matchmakingqueue;

# Count users
SELECT COUNT(*) FROM auth_user;

# Find top players by XP
SELECT u.username, p.xp, p.wins, p.losses
FROM auth_user u
JOIN users_userprofile p ON p.user_id = u.id
ORDER BY p.xp DESC LIMIT 10;
```

### Admin operations
```bash
# Reset a user's stats
UPDATE users_userprofile SET wins=0, losses=0, xp=0 WHERE user_id=1;

# Force a user offline
UPDATE users_userprofile SET is_online=false WHERE user_id=1;

# Delete a user (cascades to profile, friend requests, messages)
DELETE FROM auth_user WHERE username='test_user';

# Clear matchmaking queue (if stuck)
DELETE FROM game_matchmakingqueue;
```

---

## Django - useful commands

### Migrations
```bash
# Apply all pending migrations
docker compose exec backend python3 src/manage.py migrate

# Create new migrations after model changes
docker compose exec backend python3 src/manage.py makemigrations

# Show migration status
docker compose exec backend python3 src/manage.py showmigrations

# Show SQL for a specific migration (without applying it)
docker compose exec backend python3 src/manage.py sqlmigrate users 0001
```

### Django shell (interactive Python with full ORM access)
```bash
docker compose exec backend python3 src/manage.py shell
```

```python
# Inside the shell:
from django.contrib.auth.models import User
from users.models import UserProfile, FriendRequest
from chat.models import Message

# List all users
User.objects.all().values('id', 'username', 'email')

# Get a specific user's profile
user = User.objects.get(username='tmilin')
profile = user.profile
print(profile.wins, profile.losses, profile.xp)

# Reset a user's stats
profile.wins = 0
profile.losses = 0
profile.xp = 0
profile.save()

# List all pending friend requests
FriendRequest.objects.filter(status='pending')

# List last 10 chat messages
Message.objects.order_by('-timestamp')[:10]

# Delete a user
User.objects.get(username='test').delete()

# Set a user as staff (admin)
user = User.objects.get(username='tmilin')
user.is_staff = True
user.save()
```

### Users and admin
```bash
# Create a superuser manually
docker compose exec backend python3 src/manage.py createsuperuser

# Collect static files (Django admin CSS/JS)
docker compose exec backend python3 src/manage.py collectstatic

# View all available URL routes
docker compose exec backend python3 src/manage.py shell -c \
"from django.urls import get_resolver; [print(u) for u in get_resolver().url_patterns]"
```

### Logs and debug
```bash
# View backend logs (Django + Node.js)
docker compose logs backend
docker compose logs backend --follow

# Enter the backend container
docker compose exec backend bash

# Check Django is running
curl -k https://localhost:8443/api/users/leaderboard/

# Check Node.js is running (inside container)
docker compose exec backend curl http://localhost:3000
```

---

## API routes reference

### Users `/api/users/`
```
GET    /api/users/me/                   → connected user profile
PUT    /api/users/me/update/            → update profile
POST   /api/users/me/match/             → record a finished match
POST   /api/users/logout/               → logout
GET    /api/users/leaderboard/          → global leaderboard
GET    /api/users/search/?q=name        → search users
POST   /api/users/register/             → register
POST   /api/users/login/                → login
POST   /api/users/me/password/          → change password
DELETE /api/users/delete/               → delete account (GDPR)
POST   /api/users/upload-avatar/        → upload avatar
POST   /api/users/oauth-login/          → OAuth login (called by Node.js)
```

### Friends `/api/users/friends/`
```
GET    /api/users/friends/                   → friends list
GET    /api/users/friends/requests/          → received friend requests
POST   /api/users/friends/send/              → send friend request
POST   /api/users/friends/respond/<id>/      → accept or decline request
DELETE /api/users/friends/remove/<username>/ → remove friend
```

### Game `/api/game/`
```
POST   /api/game/create/                → create a game room
POST   /api/game/matchmaking/           → join matchmaking queue
POST   /api/game/matchmaking/cancel/    → cancel matchmaking
GET    /api/game/rooms/                 → list active rooms (spectator)
GET    /api/game/info/<room_id>/        → room details
```

### Chat `/api/chat/`
```
GET    /api/chat/history/               → last 50 messages
```

### WebSocket
```
ws://backend:8000/ws/game/<room_id>/    → online game
ws://backend:8000/ws/chat/              → global chat
```

## Security check

- #### To see the hashage of the password, first you need to get in:
```bash
docker exec -it backend python3 src/manage.py shell
```
- #### When u get into the container:
```bash
from django.contrib.auth.models import User
```
```Bash
u = User.objects.first()
```
```bash
print(u.password)
```

### Test formulaire
- by script :
```bash
<script>alert('xss')</script>
```
- by SQL injection :
```bash
' OR '1'='1
```