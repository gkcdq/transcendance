# Transcendence

_This project has been created as part of the 42 curriculum by tmilin._


## Description

__Transcendence__ is a full-stack web application built as the final project of the 42 curriculum.

- The goal is to create a multiplayer Pong game accessible from a browser, with a complete user management system, real-time online play, and a social experience (friends, chat, tournaments).
- The project is fully containerized with Docker and runs behind an Nginx reverse proxy with SSL.
- The backend is powered by Django + Django Channels for WebSocket support,
- PostgreSQL for data persistence, and Redis as a message broker.

## Instructions

-  __Prerequisites__

-  Docker >= 24.0
-  Docker Compose >= 2.0
-  Git

- __Configuration__ (.env)

- Create a .env file at the root of the project:
```
Database:
POSTGRES_DB=postgres_name
POSTGRES_USER=postgres_user
POSTGRES_PASSWORD=postgres_password
POSTGRES_HOST=postgres_host
POSTGRES_PORT=postgres_port


Django:
DJANGO_SUPERUSER_USERNAME=superusername_example
DJANGO_SUPERUSER_PASSWORD=superusername_password
DJANGO_SUPERUSER_EMAIL=superusername@email.com
DJANGO_SECRET_KEY=secret_key
DEBUG=1
ALLOWED_HOSTS=allowed_host


Container name for the Makefile:
DOCKER_COMPOSE = docker compose


For 42 intra connections:
FORTYTWO_CLIENT_SECRET=s-s0t0ud-fa0a0a0a0a0a0a0a0a0a0a0a0a0
```
- __Access__

- Frontend ➡️ https://localhost:8443/
- Django Admin ➡️ https://localhost:8443/admin/

### Release

- `make build` to build the container images
- `make up` to deploy our site
- `make down` to remove the containers
- `make clean` to erase the database
- `make` build the container image and deploy our site


## Features List

### 👤 User Management

- User registration and secure authentification.
- Login / Logout with session management.
- Profil customization (paddle color, avatar).
- Default avatar generation if none uploaded.
- Online / Offline status indicator.
- Profil page displaying user information and activity.

### 👥 Friends System

- Send / Receive firend requests.
- Accept / Decline friend requests.
- Remove friends.
- view friends list.
- See real-time online status of friends.

### 🏓 Game

- Classic local Pong (1v1 on the same keyboard).
- Octogon mode with power-ups and malus.
- Online multiplayer via WebSocket (real-time, 60 tick/s).
- Spectator mode to watch ongoing games.
- Customizable game settings (difficulty, paddle color).

### 🤖 AI Opponent

- Playable against an AI in local and octogon mode.
- Adjustable difficulty (easy / medium / hard).
- Human-like behavior (not perfect play).
- AI affected by malus power-ups (freeze, inversion, invisibility, multiball).

### 🏆 Tournament

- Tournament registration and bracket system.
- Clear matchup order and progression tracking.
- Matchmaking system for tournament participants.

### 🎮 Power-ups & Malus (Octagon Mode)

- Bonus: speed boost, canon shot, freeze ball, giant wall.
- Malus: multiballs, touch inversion, freeze opponent, little paddle, invisible paddle.
- Randomized power-up spawns during the game.

### 💬 Chat

- Global real-time chat via WebSocket.
- Message history (last 50 messages loaded on connect).

### 🔑 Authentication

- Classic registration / login.
- OAuth 2.0 login via 42 intranet.
- CSRF protection and secure session management.
- Password change and account deletion (GDPR).

### 🛡️ ADMIN

- Django admin portal.
- View, edit, and delete, users (CRUD).
- Role management (admin / user).
- Different views and actions based on user role.


## How it works

__🖥️ The User__

In the browser, the user sees __ONE__ single page ➡️ `index.html`.
Everything is then handled by Vanilla JavaScript SPA ➡️ `Single Page Application`.
The browser communicates with the server in two ways:
- __REST API__ ➡️ classic HTTP request (`login`, `profile`, ...).
- __WebSocket__ ➡️ permanent real-time connection for the game, spectator mode and chat.

---

__🚦 Nginx__

Nginx is the first entry point for all requests. It listens on port 8443 and redirects based on the URL.
It also handles the SSL certificate: openssl s_client -connect localhost:8443 -servername localhost

---

__⚙️ Django__

Django receives requests from Nginx and handles all the logic.
It is divided into several parts:


users/view.py:
- https://localhost:8443/api/users/me/                  ➡️ returns the connected profile as .JSON
- https://localhost:8443/accounts/                      ➡️ returns the profile viewed from the Django template.
- https://localhost:8443/api/users/leaderboard/         ➡️ returns the global leaderboard as .JSON
- https://localhost:8443/admin/                         ➡️ returns the Django administration portal.
- https://localhost:8443/api/users/friends/             ➡️ returns the friend list of the connected profile as .JSON
- https://localhost:8443/api/users/friends/requests/    ➡️ returns the friend requests of the profile as .JSON
- https://localhost:8443/api/users/search/              ➡️ returns the profile search page as .JSON
- [...]

game/consumer.py:
- Handles WebSockets: the online game loop runs at 60 ticks/s
- Receives player inputs, calculates positions and sends back the state.

chat/consumer.py:
- Handles WebSockets
- Receives messages, saves them and broadcasts them to everyone.

---

__🔌 Django Channels + Daphne__

Django by default cannot handle WebSockets.
Django Channels adds this capability.
Daphne is the server that runs Django in 'ASGI' (asynchronous) mode to make it work.
- Browser ⬅️ __WebSocket__ ➡️ Nginx ➡️ Daphne ➡️ Django Channels.

---

__🗄️ PostgreSQL + Django ORM__

_PostgreSQL_
- It is the database, it stores:
- users,   scores,   friends,   messages.

_Django ORM_
- Allows writing in Python to communicate with PostgreSQL.
- Example with Django ORM: *user = User.objects.get(username='user_name')*
- Same example without Django ORM: *SELECT * FROM users WHERE username = 'user_name'*

---

__🔴 Redis__

Redis is a shared in-memory storage used by Django Channels as a message broker.

_Why Redis?_
- Django Channels needs a shared space to route WebSocket messages between connections.
- When two players are in the same room, their messages pass through Redis to stay synchronized.

_How it works_
- Django Channels sends a message to a Redis "channel layer"
- Redis broadcasts it to all connected clients in the same group (game room, chat, etc.)

Without Redis, Django Channels could not communicate between multiple WebSocket connections.

---

__🔑 OAuth 42 + Node.js__

When logging in by clicking the `42` button:

- 1. Browser ➡️ redirects to api.intra.42.fr
- 2. The 42 intra ➡️ redirects back to your server with a "code"
- 3. Nginx receives /accounts/... ➡️ redirects to Node.js (port 3000)
- 4. Node.js exchanges the code for a token with the 42 API
- 5. Node.js retrieves your login + avatar from the 42 API
- 6. Node.js notifies Django to create/update the account
- 7. Node.js redirects the browser to / with login+avatar as parameters

_Node.js is used in this project solely because OAuth management was simpler to implement than in pure Django._

---

__💾 localStorage / sessionStorage__

Browser-side storage, without going through the server.

__localStorage :__
- Persists even after closing the browser.
- Used for: username, avatar, wins, losses, XP, match history

__sessionStorage :__
- Cleared when the tab is closed.
- Used for: matchmaking_active, active_room.

_userStore.js : bridges the two ➡️ it reads from the Django API on startup and syncs with localStorage._

---

__🐳 Docker / Docker Compose__

Each service/technology runs in an **isolated container**:

```JS
docker-compose.yml
├── nginx      (port 8443) - SSL, reverse proxy
├── backend    (port 8000) - Django + Daphne + Node.js (port 3000)
├── frontend   (port 8080) - Nginx serving static HTML/JS/CSS files 💡
├── db         (port 5432) - PostgreSQL
└── redis      (port 6379) - shared memory for Django Channels
```
💡 `Not used directly as Nginx serves the frontend files by reading the volumes directly.`

__Global Schema__


```JS
Browser:
   │  HTTPS (Hypertext Transfer Protocol Secure) / WSS (WebSocket Secure)
   ▼
Nginx :8443  ──────────────────────────────────────────  [SSL · static files]
   ├── /          → Frontend  (HTML / JS / CSS)
   ├── /api/      → Django    :8000
   ├── /ws/       → Daphne    :8000  (WebSocket)
   ├── /media/    → Avatars   (shared volume)
   └── /accounts/ → Node.js   :3000  (OAuth 42 callback)
                                   │
                             ┌─────┴──────────┐
                             │                │
                          Django:8000     Node.js:3000
                             │                │
                      ┌──────┤                └──→ api.intra.42.fr
                      │      │
               Daphne │   Django ORM
               (ASGI) │      │
                      │      ▼
              Django  │  PostgreSQL :5432
              Channels│
                      │      ▼
                      └──→ Redis:6379  (channel layer)
```

## Resources

__Docker / Docker Compose__
- [Learn Docker tool](https://dyma.fr/blog/docker-et-ses-conteneurs/)
- [Docker documentation](https://docs.docker.com/)
- [Docker Compose documentation](https://docs.docker.com/compose/)

__Nginx__
- [Nginx reverse proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Nginx documentation](https://docs.nginx.com/)

__Django__
- [Learn Django tool](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/Django)
- [Django documentation](https://docs.djangoproject.com/fr/6.0/)

__PostgreSQL__
- [PostgreSQL documentation](https://www.postgresql.org/docs/)

__Django ORM__
- [Learn Django ORM tool](https://python.doctor/page-django-orm-apprendre-base-donnees-database-queryset-modeles)

__Daphne (ASGI)__
- [Learn to use Daphne and Django](https://docs.djangoproject.com/fr/6.0/howto/deployment/asgi/daphne/)
- [Daphne documentation](https://daphne-eu.eu/)

__Node.js__
- [Learn Node.js tool](https://repository.root-me.org/Programmation/Javascript/Nodejs/FR%20-%20Nodejs.pdf)
- [Node.js documentation](https://nodejs.org/docs/latest/api/)

__OAuth 42__
- [OAuth documentation](https://api.intra.42.fr/apidoc)

__Vanilla JS SPA__
- [Learn Vanilla JS SPA tool](https://dev.to/moseeh_52/building-modern-spas-with-vanilla-javascript-a-beginners-guide-9a3)
- [More tool about Vanilla JS SPA](https://blog.jeremylikness.com/blog/build-a-spa-site-with-vanillajs/)

__HTML5 Canvas__
- [Learn HTML5 Canvas tool](https://www.w3schools.com/tags/ref_canvas.asp)
- [HTML5 Canvas documentation](https://docs.tizen.org/application/web/guides/w3c/graphics/canvas/)

__REST API__
- [Learn REST API tool](https://restfulapi.net/)
- [REST API Documentation](https://docs.github.com/fr/rest)

__localStorage / sessionStorage__
- [localStorage documentation](https://www.w3schools.com/jsref/prop_win_localstorage.asp)
- [sessionStorage documentation](https://www.w3schools.com/jsref/prop_win_sessionstorage.asp)

_AI has been used sparingly during this project for the following tasks:_
- _Debugging backend issues (Django views, migrations)._
- _Explaining unfamiliar concepts (WebSocket, Django Channels, OAuth flow)._
- _Helping on CSS to improve the good looking of the application._
- _Writing and improving documentation (this README)._


## Technical Stack

- __Backend__

Python / Django ➡️ Web framework, ORM, authentication
Django Channels ➡️ WebSockets (chat + online gaming)
Daphne ➡️ ASGI server for Django Channels
PostgreSQL ➡️ Database
Node.js ➡️ Callback server for 42 OAuth

- __Frontend__

Vanilla JavaScript (ES Modules) ➡️ SPA without a framework
HTML5 Canvas ➡️ Game rendering
CSS3 ➡️ Custom styles

- __Infrastructure__

Docker / Docker Compose ➡️ Containerization
Nginx ➡️ Reverse proxy, serves static frontend files

- __Security__

Django CSRF ➡️ Form protection
Django Sessions ➡️ Session management
42 OAuth ➡️ Authentication via the 42 API

- __Protocols__

REST API ➡️ Frontend / Backend communication
WebSocket (ws/wss) ➡️ Real-time online gaming + chat

- __Storage__

localStorage ➡️ Client-side cache (stats, match history)
sessionStorage ➡️ Current active room


## Database Schema

```JS
auth_user (Django built-in)
┌─────────────────────────────────┐
│ id           (PK)  int          │
│ username           char *       │
│ email              char *       │
│ password           char *       │
│ is_active          bool         │
│ date_joined        datetime     │
└────────────┬────────────────────┘
             │ 1
             │ OneToOne
             │ 1
             ▼
┌─────────────────────────────────┐         ┌──────────────────────────────────┐
│ UserProfile                     │         │ FriendRequest                    │
├─────────────────────────────────┤         ├──────────────────────────────────┤
│ id           (PK)  int          │         │ id           (PK)  int           │
│ user_id      (FK)  → auth_user  │         │ sender_id    (FK)  → auth_user   │
│ avatar             char */file  │         │ receiver_id  (FK)  → auth_user   │
│ wins               int          │         │ status             char *        │
│ losses             int          │         │                    pending /     │
│ xp                 int          │         │                    accepted /    │
│ total_seconds      int          │         │                    rejected      │
│ paddle_color       char *       │         │ created_at         datetime      │
│ ai_difficulty      char *       │         │ UNIQUE (sender_id, receiver_id)  │
│ is_online          bool         │         └──────────────────────────────────┘
└─────────────────────────────────┘              ▲                ▲
                                                 │ FK             │ FK
                                            auth_user        auth_user

┌─────────────────────────────────┐         ┌──────────────────────────────────┐
│ Message  (chat)                 │         │ MatchmakingQueue  (game)         │
├─────────────────────────────────┤         ├──────────────────────────────────┤
│ id           (PK)  int          │         │ id           (PK)  int           │
│ user_id      (FK)  → auth_user  │         │ username   (UNIQUE) char *       │
│ content            text         │         │ room_id             char *       │
│ timestamp          datetime     │         │ created_at          datetime     │
└──────────┬──────────────────────┘         └──────────────────────────────────┘
           │ FK
      auth_user


Relationships:

auth_user  ──( 1 : 1 )──>  UserProfile        one user  → one profile
auth_user  ──( 1 : N )──>  FriendRequest      one user  → many requests sent
auth_user  ──( 1 : N )──>  FriendRequest      one user  → many requests received
auth_user  ──( 1 : N )──>  Message            one user  → many messages

PK = Primary Key :
- Unique identifier for each row in the table.
- Automatically generated + auto-incremented by the DB (1, 2, 3, 4...)
- Each table has only one PK.
- Example: UserProfile.id = 42 ➡️ there is only one profile with id 42.

FK = Foreign Key :
- A reference to the PK of another table
- Creates a link between two tables
- Example: FriendRequest.sender_id = 42 ➡️ the sender is the user whose id is 42

```

## Modules

  # WEB
- [✔️] __Major :__ Implement real-time features using WebSockets or similar technology
- [✔️] __Major :__ Allow users to interact with other users
      - [✔️] A basic chat system (send/receive messages between users)
      - [✔️] A profile system (view user information)
      - [✔️] A friends system (add/remove friends, see friends list)
- [✔️] __Major :__ Implement real-time features using WebSockets or similar technology.
      - [✔️] Real-time updates across clients.
      - [✔️] Handle connection/disconnection gracefully.
      - [✔️] Efficient message broadcasting.
- [✔️] __Major :__ Allow users to interact with other users. The minimum requirements are:
      - [✔️] A basic chat system (send/receive messages between users).
      - [✔️] A profile system (view user information).
      - [✔️] A friends system (add/remove friends, see friends list)
- [✔️] __Minor :__ Use a backend framework (Express, Fastify, NestJS, Django, etc.)
- [✔️] __Minor :__  Use an ORM for the database

  # Accessibility and Internationalization

- [✔️] __Minor :__ Support for additional browsers.
      - [✔️] Full compatibility with at least 2 additional browsers (Firefox, Safari, Edge, etc.).
      - [✔️] Test and fix all features in each browser.
      - [✔️] Document any browser-specific limitations.
      - [✔️] Consistent UI/UX across all supported browsers

  # User Management

- [✔️] __Major :__ Standard user management and authentication.
      - [✔️] Users can update their profile information.
      - [✔️] Users can upload an avatar (with a default avatar if none provided).
      - [✔️] Users can add other users as friends and see their online status.
      - [✔️] Users have a profile page displaying their information.
- [✔️] __Major :__ Advanced permissions system:
      - [✔️] View, edit, and delete users (CRUD).
      - [✔️] Roles management (admin, user, guest, moderator, etc.).
      - [✔️] Different views and actions based on user role.

- [✔️] __Minor :__ Game statistics and match history (requires a game module).
      - [✔️] Track user game statistics (wins, losses, ranking, level, etc.).
      - [✔️] Display match history (1v1 games, dates, results, opponents).
      - [✔️] Show achievements and progression.
      - [✔️] Leaderboard integration.
- [✔️] __Minor :__ Implement remote authentication with OAuth 2.0 (Google, GitHub, 42, etc.).
- [✔️] __Minor :__ User activity analytics and insights dashboard

  # Artificial Intelligence

- [✔️] __Major :__ Introduce an AI Opponent for games.
      - [✔️] The AI must be challenging and able to win occasionally.
      - [✔️] The AI should simulate human-like behavior (not perfect play).
      - [✔️] If you implement game customization options, the AI must be able to use them.
      - [✔️] You must be able to explain your AI implementation during evaluation
  
  # Gaming and user experience

- [✔️] __Major :__ Implement a complete web-based game where users can play against each other.
      - [✔️] The game can be real-time multiplayer (e.g., Pong, Chess, Tic-Tac-Toe, Card game, etc.).
      - [✔️] Players must be able to play live matches.
      - [✔️] The game must have clear rules and win/loss conditions.
      - [✔️] The game can be 2D or 3D.

- [✔️] __Minor :__ Implement a tournament system.
      - [✔️] Clear matchup order and bracket system.
      - [✔️] Track who plays against whom.
      - [✔️] Matchmaking system for tournament participants.
      - [✔️] Tournament registration and management.
- [✔️] __Minor :__ Game customization options.
      - [✔️] Power-ups, attacks, or special abilities.
      - [✔️] Different maps or themes.
      - [✔️] Customizable game settings.
      - [✔️] Default options must be available.
- [✔️] __Minor :__ A gamification system to reward users for their actions.
      - [✔️] Implement at least 3 of the following: achievements, badges, leaderboards, XP/level system, daily challenges, rewards
      - [✔️] System must be persistent (stored in database)
      - [✔️] Visual feedback for users (notifications, progress bars, etc.)
      - [✔️] Clear rules and progression mechanics
- [✔️] __Minor :__ Implement spectator mode for games.
      - [✔️] Allow users to watch ongoing games.
      - [✔️] Real-time updates for spectators.
      - [❌] Optional: spectator chat.


# Individual Contributions

_TODO_

# File review

- __Backend__ (backend/src/)

- manage.py                               - Django entry point; handles commands like migrate and runserver.

- transcendance/settings.py               - Django configuration (Database, installed apps, CORS, etc.).
- transcendance/asgi.py                   - Manages WebSockets via Django Channels.
- transcendance/urls.py                   - Main URL routing required by Django.

- users/urls.py                           - Defines the User application API by mapping each URL.
- users/views.py                          - REST API: login, register, profile, friends, GDPR compliance.
- users/models.py                         - UserProfile model (wins, losses, avatar, etc.).
- users/signals.py                        - Automatically creates a profile when a User is created.
- users/admin.py                          - Registers the UserProfile model in the Django admin interface (edit/delete from the site).
- users/apps.py                           - Activates the users app and automates signal loading.

- users/providers/fortytwo/provider.py    - OAuth 42: exchanges code for a token (processes 42 API data: image, name, email, etc.).
- users/providers/fortytwo/urls.py        - OAuth2 authentication routes.
- users/providers/fortytwo/views.py       - OAuth2 connection logic specific to the 42 API.

- game/consumers.py                       - Online game WebSocket logic (matchmaking, server-side game loop).
- game/views.py                           - REST API: create a room, list active rooms.
- game/apps.py                            - Configuration of the game application within Django.
- game/routing.py                         - WebSocket routes for online play.
- game/models.py                          - Database model for a matchmaking queue.
- game/urls.py                            - Defines HTTP routes for online play.

- chat/apps.py                            - Configures the chat application.
- chat/consumers.py                       - WebSocket for global chat.
- chat/models.py                          - Defines the message structure in the database.
- chat/routing.py                         - Registers the WebSocket route for the chat.
- chat/urls.py                            - Defines an HTTP route pointing to message history.
- chat/views.py                           - Retrieves the 50 most recent messages from the database.

- Dockerfile                              - Describes build steps (installs dependencies: Python, Node.js, PostgreSQL).
- package.json                            - Defines Node.js environment configuration and dependencies (Express, Socket.io).
- requirements.txt                        - Lists all necessary libraries: Django, PostgreSQL, ASGI/WebSockets.
- server.js                               - Node.js server for the 42 OAuth callback.
- 
- __Frontend__ (frontend/src/)

- main.js                                 - Bootstrap: initializes userStore, declares navigateTo, router, and global functions.

- utils/Routes.js                         - Defines all routes (/, /game, /profile, etc.) with their render() and init() methods.
- utils/State.js                          - Shared global state: currentPongInstance, isOnline, globalChatWS, lockNav, unlockNav.
- utils/userStore.js                      - Abstraction layer between localStorage and Django API: get, set, recordMatch, logout.
- utils/Pong.js                           - Classic local game: initPongGame + startGameLogic.
- utils/ModeGame.js                       - Octagon mode game: initModeGame + startGameModeLogic with power-ups.
- utils/OnlinePong.js                     - Online game via WebSocket: initOnlinePong.
- utils/settings.js                       - Settings page: paddle color, AI difficulty, account deletion.

- components/Navbar.js                    - Navbar rendering.
- 
- __Infrastructure__

- nginx/nginx.conf                        - Reverse proxy: redirects /api/ to Django, /ws/ to Channels, and everything else to the frontend.
- docker-compose.yml                      - Orchestrates the containers: frontend (Nginx), backend (Django+Daphne), and db (PostgreSQL).
- Makefile                                - Shortcuts: make up, make down, make logs, etc.