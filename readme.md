# Transcendence

This project has been created as part of the 42 curriculum by
tmilin.

## Description

_The "Description" section should also contain a clear name for the project and its
key features._

_TODO_

## Overview

- - _Prerequisites_

-  Docker >= 24.0
-  Docker Compose >= 2.0
-  Git


- - _Configuration_ (.env)

- Create a .env file at the root of the project:
```PY
\Database
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_HOST=
POSTGRES_PORT=

\Django
DJANGO_SUPERUSER_USERNAME=
DJANGO_SUPERUSER_PASSWORD=
DJANGO_SUPERUSER_EMAIL=
DJANGO_SECRET_KEY=
DEBUG=
ALLOWED_HOSTS=


\Container name for the Makefile
DOCKER_COMPOSE =

\For 42 intra connections
FORTYTWO_CLIENT_ID=
FORTYTWO_CLIENT_SECRET=
```
- - _Access_

- Frontend ➡️ https://localhost:8443/
- Django Admin ➡️ https://localhost:8443/admin/

### Release

- `make build` to build the container images
- `make up` to deploy our site
- `make down` to remove the containers
- `make clean` to erase the database
- `make` build the container image and deploy our site

## Resources

_TODO_

## Team Information

### //

_TODO: role_
_TODO: brief description of their responsibilities_

### //

__Technical Lead__
_TODO: brief description of their responsibilities_

### //

_TODO: role_
_TODO: brief description of their responsibilities_

## Project Management

_TODO_


## Features List

-  Docker / Docker Compose
-  Nginx reverse proxy
-  Django + Django Channels (WebSocket)
-  PostgreSQL + Django ORM
-  Daphne (ASGI)
-  Node.js (OAuth callback)
-  OAuth 42
-  Vanilla JS SPA
-  HTML5 Canvas
-  REST API
-  localStorage / sessionStorage


## How it works

__🖥️ The User__

In the browser, the user sees ONE single page ➡️ `index.html`.
Everything is then handled by Vanilla JavaScript SPA ➡️ `Single Page Application`.
The browser communicates with the server in two ways:
- _REST API_ ➡️ classic HTTP request (`login`, `profile`, ...).
- _WebSocket_ ➡️ permanent real-time connection for the game, spectator mode and chat.

---

__🚦 Nginx__

Nginx is the first entry point for all requests. It listens on port 8443 and redirects based on the URL.
It also handles the SSL certificate: openssl s_client -connect localhost:8443 -servername localhost

---

__⚙️ Django__

Django receives requests from Nginx and handles all the logic.
It is divided into several parts:


[users/view.py]:
- https://localhost:8443/api/users/me/                  ➡️ returns the connected profile as .JSON
- https://localhost:8443/accounts/                      ➡️ returns the profile viewed from the Django template.
- https://localhost:8443/api/users/leaderboard/         ➡️ returns the global leaderboard as .JSON
- https://localhost:8443/admin/                         ➡️ returns the Django administration portal.
- https://localhost:8443/api/users/friends/             ➡️ returns the friend list of the connected profile as .JSON
- https://localhost:8443/api/users/friends/requests/    ➡️ returns the friend requests of the profile as .JSON
- https://localhost:8443/api/users/search/              ➡️ returns the profile search page as .JSON
- ...

[game/consumer.py]
- Handles WebSockets: the online game loop runs at 60 ticks/s
- Receives player inputs, calculates positions and sends back the state.

[chat/consumer.py]
- Handles WebSockets
- Receives messages, saves them and broadcasts them to everyone.

---

__🔌 Django Channels + Daphne__

Django by default cannot handle WebSockets.
Django Channels adds this capability.
Daphne is the server that runs Django in 'ASGI' (asynchronous) mode to make it work.
- Browser ⬅️ __[WebSocket]__ ➡️ Nginx ➡️ Daphne ➡️ Django Channels.

---

__🗄️ PostgreSQL + Django ORM__

\\ _PostgreSQL_
- It is the database, it stores:
- users,   scores,   friends,   messages.

\\ _Django ORM_
- Allows writing in Python to communicate with PostgreSQL.
- Example with Django ORM: *user = User.objects.get(username='user_name')*
- Same example without Django ORM: *SELECT * FROM users WHERE username = 'user_name'*

---

__🔑 OAuth 42 + Node.js__

When logging in by clicking the [42] button:

- 1. Browser ➡️ redirects to api.intra.42.fr
- 2. The 42 intra ➡️ redirects back to your server with a "code"
- 3. Nginx receives /accounts/... ➡️ redirects to Node.js (port 3000)
- 4. Node.js exchanges the code for a token with the 42 API
- 5. Node.js retrieves your login + avatar from the 42 API
- 6. Node.js notifies Django to create/update the account
- 7. Node.js redirects the browser to / with login+avatar as parameters

Node.js is used in this project solely because OAuth management was simpler to implement than in pure Django.

---

__💾 localStorage / sessionStorage__

Browser-side storage, without going through the server.

\\ _localStorage_ : persists even after closing the browser.
- Used for: username, avatar, wins, losses, XP, match history

\\ _sessionStorage_ : cleared when the tab is closed.
- Used for: `matchmaking_active`, `active_room`.

`userStore.js` bridges the two ➡️ it reads from the Django API on startup and syncs with localStorage.

---

__🐳 Docker / Docker Compose__

Each service/technology runs in an **isolated container**:

```JS
docker-compose.yml
├── nginx      (port 8443) - SSL reverse proxy.
├── backend    (port 8000) - Django + Node.js (port 3000)
├── frontend   (port 8080) - Nginx serving static HTML/JS/CSS files 💡
├── db         (port 5432) - PostgreSQL
└── redis      (port 6379) - shared memory for Django Channels
```
💡 `Not used directly as Nginx serves the frontend files by reading the volumes directly.`

__Global Schema__

```JS
Browser:
    │
    │ HTTPS (Hypertext Transfer Protocol Secure) / WSS (WebSocket Secure)
    ▼
  Nginx :8443
    ├── /          → frontend (HTML/JS/CSS)
    ├── /api/      → Django :8000
    ├── /ws/       → Daphne :8000 (WebSocket)
    ├── /media/    → avatar files
    └── /accounts/ → Node.js :3000
                          │
                    Django :8000
                          │
                    PostgreSQL :5432
                          │
                    Redis :6379
```

## Complete Stack

- - __Backend__

    Python / Django ➡️ Web framework, ORM, authentication
    Django Channels ➡️ WebSockets (chat + online gaming)
    Daphne ➡️ ASGI server for Django Channels
    PostgreSQL ➡️ Database
    Node.js ➡️ Callback server for 42 OAuth

- - __Frontend__

    Vanilla JavaScript (ES Modules) ➡️ SPA without a framework
    HTML5 Canvas ➡️ Game rendering
    CSS3 ➡️ Custom styles

- - __Infrastructure__

    Docker / Docker Compose ➡️ Containerization
    Nginx ➡️ Reverse proxy, serves static frontend files

- - __Security__

    Django CSRF ➡️ Form protection
    Django Sessions ➡️ Session management
    42 OAuth ➡️ Authentication via the 42 API

- - __Protocols__

    REST API ➡️ Frontend / Backend communication
    WebSocket (ws/wss) ➡️ Real-time online gaming + chat

- - __Storage__

    localStorage ➡️ Client-side cache (stats, match history)
    sessionStorage ➡️ Current active room


## Database Schema

```PY
┌─────────────────────────────────┐
│         auth_user (Django)      │
├─────────────────────────────────┤
│ id          (PK)                │
│ username                        │
│ email                           │
│ password                        │
│ is_active                       │
│ date_joined                     │
└────────────┬────────────────────┘
             │
             │                         ┌──────────────────────────┐
             ▼                         │      FriendRequest       │
┌─────────────────────────────────┐    ├──────────────────────────┤
│         UserProfile             │    │ id           (PK)        │
├─────────────────────────────────┤    │ sender_id    (FK → User) │
│ id           (PK)               │    │ receiver_id  (FK → User) │
│ user_id      (FK → User)        │    │ status       pending/    │
│ avatar       (URL)              │    │              accepted/   │
│ wins                            │    │              rejected    │
│ losses                          │    │ created                  │
│ xp                              │    │ UNIQUE(sender, receiver) │
│ total_seconds                   │    └──────────────────────────┘
│ paddle_color                    │
│ ai_difficulty                   │
│ is_online                       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│           Message               │
├─────────────────────────────────┤
│ id          (PK)                │
│ user_id     (FK → User)         │
│ content                         │
│ timestamp                       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│       MatchmakingQueue          │
├─────────────────────────────────┤
│ id          (PK)                │
│ username    (UNIQUE)            │
│ room_id                         │
│ created_at                      │
└─────────────────────────────────┘
```
__PK__ = _Primary Key_ :
- Unique identifier for each row in the table.
- Automatically generated by the DB (1, 2, 3, 4...)
- Each table has only one __PK__.
- Example: `UserProfile.id = 42` ➡️ there is only one profile with id 42
__FK__ = _Foreign Key_ :
- A reference to the __PK__ of another table
- Creates a link between two tables
- Example: `FriendRequest.sender_id = 42` ➡️ the sender is the user whose id is 42


## Modules

  # WEB
- [✔️] __Major__ Implement real-time features using WebSockets or similar technology
- [✔️] __Major__ Allow users to interact with other users
      - [✔️] A basic chat system (send/receive messages between users)
      - [✔️] A profile system (view user information)
      - [✔️] A friends system (add/remove friends, see friends list)
- [✔️] __Major__ Implement real-time features using WebSockets or similar technology.
      - [✔️] Real-time updates across clients.
      - [✔️] Handle connection/disconnection gracefully.
      - [✔️] Efficient message broadcasting.
- [✔️] __Major__ Allow users to interact with other users. The minimum requirements are:
      - [✔️] A basic chat system (send/receive messages between users).
      - [✔️] A profile system (view user information).
      - [✔️] A friends system (add/remove friends, see friends list)

- [✔️] _Minor_ Use a backend framework (Express, Fastify, NestJS, Django, etc.)
- [✔️] _Minor_ Use an ORM for the database

  # Accessibility and Internationalization

- [✔️] _Minor_ Support for additional browsers.
      - [✔️] Full compatibility with at least 2 additional browsers (Firefox, Safari, Edge, etc.).
      - [✔️] Test and fix all features in each browser.
      - [✔️] Document any browser-specific limitations.
      - [✔️] Consistent UI/UX across all supported browsers

  # User Management

- [✔️] __Major__ Standard user management and authentication.
      - [✔️] Users can update their profile information.
      - [✔️] Users can upload an avatar (with a default avatar if none provided).
      - [✔️] Users can add other users as friends and see their online status.
      - [✔️] Users have a profile page displaying their information.
- [✔️] __Major__ Advanced permissions system:
      - [✔️] View, edit, and delete users (CRUD).
      - [✔️] Roles management (admin, user, guest, moderator, etc.).
      - [✔️] Different views and actions based on user role.
- [✔️] _Minor_ Game statistics and match history (requires a game module).
      - [✔️] Track user game statistics (wins, losses, ranking, level, etc.).
      - [✔️] Display match history (1v1 games, dates, results, opponents).
      - [✔️] Show achievements and progression.
      - [✔️] Leaderboard integration.

- [✔️] _Minor_ Implement remote authentication with OAuth 2.0 (Google, GitHub, 42, etc.).
- [✔️] _Minor_ User activity analytics and insights dashboard

  # Artificial Intelligence

- [✔️] __Major__ Introduce an AI Opponent for games.
      - [✔️] The AI must be challenging and able to win occasionally.
      - [✔️] The AI should simulate human-like behavior (not perfect play).
      - [✔️] If you implement game customization options, the AI must be able to use them.
      - [✔️] You must be able to explain your AI implementation during evaluation
  
  # Gaming and user experience

- [✔️] __Major__ Implement a complete web-based game where users can play against each other.
      - [✔️] The game can be real-time multiplayer (e.g., Pong, Chess, Tic-Tac-Toe, Card game, etc.).
      - [✔️] Players must be able to play live matches.
      - [✔️] The game must have clear rules and win/loss conditions.
      - [✔️] The game can be 2D or 3D.

- [✔️] _Minor_ Implement a tournament system.
      - [✔️] Clear matchup order and bracket system.
      - [✔️] Track who plays against whom.
      - [✔️] Matchmaking system for tournament participants.
      - [✔️] Tournament registration and management.
- [✔️] _Minor_ Game customization options.
      - [✔️] Power-ups, attacks, or special abilities.
      - [✔️] Different maps or themes.
      - [✔️] Customizable game settings.
      - [✔️] Default options must be available.
- [✔️] _Minor_ A gamification system to reward users for their actions.
      - [✔️] Implement at least 3 of the following: achievements, badges, leaderboards, XP/level system, daily challenges, rewards
      - [✔️] System must be persistent (stored in database)
      - [✔️] Visual feedback for users (notifications, progress bars, etc.)
      - [✔️] Clear rules and progression mechanics
- [✔️] _Minor_ Implement spectator mode for games.
      - [✔️] Allow users to watch ongoing games.
      - [✔️] Real-time updates for spectators.
      - [❌] Optional: spectator chat.


# Individual Contributions

_TODO_

# File review

- - __Backend__ (backend/src/)

- manage.py                               — Django entry point; handles commands like migrate and runserver.

- transcendance/settings.py               — Django configuration (Database, installed apps, CORS, etc.).
- transcendance/asgi.py                   — Manages WebSockets via Django Channels.
- transcendance/urls.py                   — Main URL routing required by Django.

- users/urls.py                           — Defines the User application API by mapping each URL.
- users/views.py                          — REST API: login, register, profile, friends, GDPR compliance.
- users/models.py                         — UserProfile model (wins, losses, avatar, etc.).
- users/signals.py                        — Automatically creates a profile when a User is created.
- users/admin.py                          — Registers the UserProfile model in the Django admin interface (edit/delete from the site).
- users/apps.py                           — Activates the users app and automates signal loading.

- users/providers/fortytwo/provider.py    — OAuth 42: exchanges code for a token (processes 42 API data: image, name, email, etc.).
- users/providers/fortytwo/urls.py        — OAuth2 authentication routes.
- users/providers/fortytwo/views.py       — OAuth2 connection logic specific to the 42 API.

- game/consumers.py                       — Online game WebSocket logic (matchmaking, server-side game loop).
- game/views.py                           — REST API: create a room, list active rooms.
- game/apps.py                            — Configuration of the game application within Django.
- game/routing.py                         — WebSocket routes for online play.
- game/models.py                          — Database model for a matchmaking queue.
- game/urls.py                            — Defines HTTP routes for online play.

- chat/apps.py                            — Configures the chat application.
- chat/consumers.py                       — WebSocket for global chat.
- chat/models.py                          — Defines the message structure in the database.
- chat/routing.py                         — Registers the WebSocket route for the chat.
- chat/urls.py                            — Defines an HTTP route pointing to message history.
- chat/views.py                           — Retrieves the 50 most recent messages from the database.

- Dockerfile                              — Describes build steps (installs dependencies: Python, Node.js, PostgreSQL).
- package.json                            — Defines Node.js environment configuration and dependencies (Express, Socket.io).
- requirements.txt                        — Lists all necessary libraries: Django, PostgreSQL, ASGI/WebSockets.
- server.js                               — Node.js server for the 42 OAuth callback.

- - __Frontend__ (frontend/src/)

- main.js                                 — Bootstrap: initializes userStore, declares navigateTo, router, and global functions.

- utils/Routes.js                         — Defines all routes (/, /game, /profile, etc.) with their render() and init() methods.
- utils/State.js                          — Shared global state: currentPongInstance, isOnline, globalChatWS, lockNav, unlockNav.
- utils/userStore.js                      — Abstraction layer between localStorage and Django API: get, set, recordMatch, logout.
- utils/Pong.js                           — Classic local game: initPongGame + startGameLogic.
- utils/ModeGame.js                       — Octagon mode game: initModeGame + startGameModeLogic with power-ups.
- utils/OnlinePong.js                     — Online game via WebSocket: initOnlinePong.
- utils/settings.js                       — Settings page: paddle color, AI difficulty, account deletion.

- components/Navbar.js                    — Navbar rendering.

- - __Infrastructure__

- nginx/nginx.conf                        — Reverse proxy: redirects /api/ to Django, /ws/ to Channels, and everything else to the frontend.
- docker-compose.yml                      — Orchestrates the containers: frontend (Nginx), backend (Django+Daphne), and db (PostgreSQL).
- Makefile                                — Shortcuts: make up, make down, make logs, etc.


## Database & Django Commands

__🐳 Container access__
```bash
# Enter the backend container
docker compose exec backend bash

# Enter the database container
docker compose exec db psql -U db_user -d transcendence_db
```

__🗄️ PostgreSQL — navigating the database__
```bash
# List all tables
\dt

# View the structure of a table
\d users_userprofile

# View all users
SELECT id, username, email FROM auth_user;

# View all profiles
SELECT * FROM users_userprofile;

# View friend requests
SELECT * FROM users_friendrequest;

# View chat messages
SELECT * FROM chat_message ORDER BY timestamp DESC LIMIT 10;

# Quit psql
\q
```

__⚙️ Django — useful commands__
```bash
# Apply migrations
docker compose exec backend python3 src/manage.py migrate

# Create new migrations
docker compose exec backend python3 src/manage.py makemigrations

# Access the Django shell (interactive Python with access to models)
docker compose exec backend python3 src/manage.py shell

# Manually create a superuser
docker compose exec backend python3 src/manage.py createsuperuser

# View all available routes
docker compose exec backend python3 src/manage.py shell -c \
"from django.urls import get_resolver; [print(u) for u in get_resolver().url_patterns]"
```

__Routes__

🎮 Game:
```
game-create              → create an online game room
game-matchmaking         → join the matchmaking queue
game-matchmaking-cancel  → cancel the search
active-rooms             → list ongoing matches (spectator)
game-info                → info about a specific room
```

💬 Chat:
```
chat-history             → retrieve the 50 most recent messages
```

👤 Users:
```
user-me                  → connected user's profile
user-update              → edit profile (paddle color, AI difficulty)
user-match               → record a finished match
user-logout              → logout
user-leaderboard         → global leaderboard
user-search              → search a user by username
oauth-login              → login via OAuth 42 (called by Node.js)
register                 → classic registration
login                    → classic login
update-password          → change password
delete-account           → delete account (GDPR)
```

👥 Friends:
```
friends                  → friends list
friend-requests          → received friend requests
friend-send              → send a friend request
friend-respond           → accept/decline a request
friend-remove            → remove a friend
```

🔑 OAuth 42 + django-allauth:
```
fortytwo_login           → redirects to the 42 intra
fortytwo_callback        → receives the code returned by the 42 intra
socialaccount_*          → social account management (allauth)
account_*                → allauth account management (email, password, logout...)
```

---

```bash
# View all URL links for routes
docker compose exec backend python3 src/manage.py shell -c "
from django.urls import reverse
routes = [
    'user-me', 'user-update', 'user-match', 'user-logout',
    'user-leaderboard', 'user-search', 'oauth-login',
    'register', 'login', 'delete-account',
    'friends', 'friend-requests', 'friend-send',
    'chat-history', 'game-create', 'game-matchmaking',
    'active-rooms',
]
for name in routes:
    try:
        print(f'{name:35} → {reverse(name)}')
    except:
        print(f'{name:35} → (parameter required)')
"
```
```
user-me                             → /api/users/me/
user-update                         → /api/users/me/update/
user-match                          → /api/users/me/match/
user-logout                         → /api/users/logout/
user-leaderboard                    → /api/users/leaderboard/
user-search                         → /api/users/search/
oauth-login                         → /api/users/oauth-login/
register                            → /api/users/register/
login                               → /api/users/login/
delete-account                      → /api/users/delete/
friends                             → /api/users/friends/
friend-requests                     → /api/users/friends/requests/
friend-send                         → /api/users/friends/send/
chat-history                        → /api/chat/history/
game-create                         → /api/game/create/
game-matchmaking                    → /api/game/matchmaking/
active-rooms                        → /api/game/rooms/
```
