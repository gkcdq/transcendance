# Transcendence

This project has been created as part of the 42 curriculum by
tmilin.

## Description

_The “Description” section should also contain a clear name for the project and its
key features._

_TODO_

## Instruction

- - _Prérequis_

-  Docker >= 24.0
-  Docker Compose >= 2.0
-  Git


- - _Configuration_ (.env)

- Crée un fichier .env à la racine du projet:
\\ Database
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_HOST=
POSTGRES_PORT=

\\ Django
DJANGO_SUPERUSER_USERNAME=
DJANGO_SUPERUSER_PASSWORD=
DJANGO_SUPERUSER_EMAIL=
DJANGO_SECRET_KEY=
DEBUG=1
ALLOWED_HOSTS=

\\ Nom du containers pour le Makefile
DOCKER_COMPOSE = docker compose

\\Pour les connection de l'intra
FORTYTWO_CLIENT_ID=
FORTYTWO_CLIENT_SECRET=


- - _Lancer le projet_

make up       # Lance tous les containers
make down     # Arrête tout
make logs     # Affiche les logs
make re       # Rebuild complet

- - _Accès_

- Frontend ➡️ https://localhost:8443/
- Admin Django ➡️ https://localhost:8443/admin/


### Before anything

- Tested with Docker 29.0.0 or Podman 5.7.1 (with the `DOCKER` variable set to
`podman` in `Makefile`)
- `cp .env.example .env` and edit `.env` as necessary
- The server will listen on port `8000`

### Release

- `make build` to build the container images
- `make up` to deploy our site
- `make down` to remove the containers
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


## Complet Stack

- - _Backend_

    Python / Django ➡️ Web framework, ORM, authentication
    Django Channels ➡️ WebSockets (chat + online gaming)
    Daphne ➡️ ASGI server for Django Channels
    PostgreSQL ➡️ Database
    Node.js ➡️ Callback server for 42 OAuth

- - _Frontend_

    Vanilla JavaScript (ES Modules) ➡️ SPA without a framework
    HTML5 Canvas ➡️ Game rendering
    CSS3 ➡️ Custom styles

- - _Infrastructure_

    Docker / Docker Compose ➡️ Containerization
    Nginx ➡️ Reverse proxy, serves static frontend files

- - _Security_

    Django CSRF ➡️ Form protection
    Django Sessions ➡️ Session management
    42 OAuth ➡️ Authentication via the 42 API

- - _Protocols_

    REST API ➡️ Frontend / Backend communication
    WebSocket (ws/wss) ➡️ Real-time online gaming + chat

- - _Storage_

    localStorage ➡️ Client-side cache (stats, match history)
    sessionStorage ➡️ Current active room


## Database Schema

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

## Modules

  # WEB
- [✔️] _Major_ Implement real-time features using WebSockets or similar technology
- [✔️] _Major_ Allow users to interact with other users
      - [✔️] A basic chat system (send/receive messages between users)
      - [✔️] A profile system (view user information)
      - [✔️] A friends system (add/remove friends, see friends list)
- [✔️] _Major_ Implement real-time features using WebSockets or similar technology.
      - [✔️] Real-time updates across clients.
      - [✔️] Handle connection/disconnection gracefully.
      - [✔️] Efficient message broadcasting.
- [✔️] _Major_ Allow users to interact with other users. The minimum requirements are:
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

- [➖] _Major_ Standard user management and authentication.
      - [➖] Users can update their profile information.
      - [✔️] Users can upload an avatar (with a default avatar if none provided).
      - [✔️] Users can add other users as friends and see their online status.
      - [✔️] Users have a profile page displaying their information.
- [✔️] _Major_ Advanced permissions system:
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

- [✔️] _Major_ Introduce an AI Opponent for games.
      - [✔️] The AI must be challenging and able to win occasionally.
      - [✔️] The AI should simulate human-like behavior (not perfect play).
      - [✔️] If you implement game customization options, the AI must be able to use them.
      - [✔️] You must be able to explain your AI implementation during evaluation
  
  # Gaming and user experience

- [➖] _Major_ Implement a complete web-based game where users can play against each other.
      - [✔️] The game can be real-time multiplayer (e.g., Pong, Chess, Tic-Tac-Toe, Card game, etc.).
      - [✔️] Players must be able to play live matches.
      - [➖] The game must have clear rules and win/loss conditions.
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

- - (pour le moment) 24/14


# Individual Contributions

_TODO_

# File review (en)

- - _Backend_ (backend/src/)

- manage.py — Django entry point; handles commands like migrate and runserver.

- transcendance/settings.py — Django configuration (Database, installed apps, CORS, etc.).
- transcendance/asgi.py — Manages WebSockets via Django Channels.
- transcendance/urls.py — Main URL routing required by Django.

- users/urls.py — Defines the User application API by mapping each URL.
- users/views.py — REST API: login, register, profile, friends, GDPR compliance.
- users/models.py — UserProfile model (wins, losses, avatar, etc.).
- users/signals.py — Automatically creates a profile when a User is created.
- users/admin.py — Registers the UserProfile model in the Django admin interface (edit/delete from the site).
- users/apps.py — Activates the users app and automates signal loading.

- users/providers/fortytwo/provider.py — OAuth 42: exchanges code for a token (processes 42 API data: image, name, email, etc.).
- users/providers/fortytwo/urls.py — OAuth2 authentication routes.
- users/providers/fortytwo/views.py — OAuth2 connection logic specific to the 42 API.

- game/consumers.py — Online game WebSocket logic (matchmaking, server-side game loop).
- game/views.py — REST API: create a room, list active rooms.
- game/apps.py — Configuration of the game application within Django.
- game/routing.py — WebSocket routes for online play.
- game/models.py — Database model for a matchmaking queue.
- game/urls.py — Defines HTTP routes for online play.

- chat/apps.py — Configures the chat application.
- chat/consumers.py — WebSocket for global chat.
- chat/models.py — Defines the message structure in the database.
- chat/routing.py — Registers the WebSocket route for the chat.
- chat/urls.py — Defines an HTTP route pointing to message history.
- chat/views.py — Retrieves the 50 most recent messages from the database.

- Dockerfile — Describes build steps (installs dependencies: Python, Node.js, PostgreSQL).
- package.json — Defines Node.js environment configuration and dependencies (Express, Socket.io).
- requirements.txt — Lists all necessary libraries: Django, PostgreSQL, ASGI/WebSockets.
- server.js — Node.js server for the 42 OAuth callback.

- - _Frontend_ (frontend/src/)

- main.js — Bootstrap: initializes userStore, declares MapsTo, router, and global functions.

- utils/Routes.js — Defines all routes (/, /game, /profile, etc.) with their render() and init() methods.
- utils/State.js — Shared global state: currentPongInstance, isOnline, globalChatWS, lockNav, unlockNav.
- utils/userStore.js — Abstraction layer between localStorage and Django API: get, set, recordMatch, logout.
- utils/Pong.js — Classic local game: initPongGame + startGameLogic.
- utils/ModeGame.js — Octagon mode game: initModeGame + startGameModeLogic with power-ups.
- utils/OnlinePong.js — Online game via WebSocket: initOnlinePong.
- utils/settings.js — Settings page: paddle color, AI difficulty, account deletion.
- utils/api.js — Generic fetch helpers (likely rarely used since userStore handles calls).

- - _Infrastructure_

- nginx/nginx.conf — Reverse proxy: redirects /api/ to Django, /ws/ to Channels, and everything else to the frontend.
- docker-compose.yml — Orchestrates the 3 containers: frontend (Nginx), backend (Django+Daphne), and db (PostgreSQL).
- Makefile — Shortcuts: make up, make down, make logs, etc.



# File review (fr)

- - _Backend_ (backend/src/)

- manage.py                                — point d'entrée Django, commandes comme migrate, runserver

- transcendance/settings.py                — configuration Django (DB, apps installées, CORS, etc.)
- transcendance/asgi.py                    — gère les WebSockets via Django Channels
- transcendance/urls.py                    — chemin dont Django a besoin

- users/urls.py                            — définit l'API de ton application utilisateur, en reliant chaque URL
- users/views.py                           — API REST : login, register, profil, amis, RGPD
- users/models.py                          — modèle UserProfile (wins, losses, avatar, etc.)
- users/signals.py                         — crée automatiquement un profil quand un User est créé
- users/admin.py                           — enregistre le modèle UserProfile dans l'interface d'administration de Django (modif/supp depuis le site)
- users/apps.py                            — active l'application users et automatise le chargement des signaux (comme créer un profil)

- users/providers/fortytwo/provider.py     — OAuth 42 : échange le code contre un token (Traitement des donnees de l'api 42 (image, nom, email ...))
- users/providers/fortytwo/urls.py         — routes d'authentification OAuth2
- users/providers/fortytwo/views.py        — Logique de connexion OAuth2 spécifique à l'API 42

- game/consumers.py                        — logique WebSocket du jeu online (matchmaking, game loop serveur)
- game/views.py                            — API REST : créer une room, lister les rooms actives
- game/apps.py                             — configuration de notre jeu dans Django
- game/routing.py                          — les routes WebSocket du online
- game/models.py                           — modèle de base de données pour une file d'attente
- game/urls.py                             — définit les routes HTTP du online

- chat/apps.py                             — configure l'application chat
- chat/consumers.py                        — WebSocket du chat global
- chat/models.py                           — définit la structure des messages dans ta base de données
- chat/routing.py                          — enregistre la route WebSocket pour le chat
- chat/urls.py                             — définit une route HTTP pointant vers l'historique des messages
- chat/views.py                            — récupère les 50 messages les plus récents depuis la base de données

- Dockerfile                               — décrit les étapes de construction (installe les dépendances (Python, Node.js, PostgreSQL))
- package.json                             — définit la configuration de l'environnement de Node.js, listant les dépendances (Express, Socket.io)
- requirement.txt                          — regroupe l'ensemble des bibliothèques nécessaires : Django, PostgreSQL, ASGI/WebSockets
- server.js                                — serveur Node.js pour le callback OAuth 42



- - _Frontend_ (frontend/src/)

- main.js                — bootstrap : init userStore, déclare navigateTo, router, fonctions globales

- utils/Routes.js        — définit toutes les routes (/, /game, /profile, etc.) avec leur render() et init()
- utils/State.js         — état global partagé : currentPongInstance, isOnline, globalChatWS, lockNav, unlockNav
- utils/userStore.js     — abstraction localStorage ↔ API Django : get, set, recordMatch, logout
- utils/Pong.js          — jeu local classique : initPongGame + startGameLogic
- utils/ModeGame.js      — jeu mode octogone : initModeGame + startGameModeLogic avec bonus
- utils/OnlinePong.js    — jeu online via WebSocket : initOnlinePong
- utils/settings.js      — page settings : couleur raquette, difficulté IA, suppression compte
- utils/api.js           — helpers fetch génériques (probablement peu utilisé depuis que userStore gère les appels)

- components/Navbar.js   — rendu de la navbar



- - _Infrastructure_

- nginx/nginx.conf      — reverse proxy : redirige /api/ vers Django, /ws/ vers Channels, le reste vers le frontend
- docker-compose.yml    — orchestre les 3 containers : frontend (nginx), backend (Django+Daphne), db (PostgreSQL)
- Makefile              — raccourcis : make up, make down, make logs, etc.