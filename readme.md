# Transcendence

This project has been created as part of the 42 curriculum by
tmilin.

## Description

_The “Description” section should also contain a clear name for the project and its
key features._

_TODO_

## Overview

- - _Prérequis_

-  Docker >= 24.0
-  Docker Compose >= 2.0
-  Git


- - _Configuration_ (.env)

- Crée un fichier .env à la racine du projet:
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


\Nom du containers pour le Makefile
DOCKER_COMPOSE =

\Pour les connection de l'intra
FORTYTWO_CLIENT_ID=
FORTYTWO_CLIENT_SECRET=
```
- - _Accès_

- Frontend ➡️ https://localhost:8443/
- Admin Django ➡️ https://localhost:8443/admin/

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

__🖥️ L'utilisateur__

Sur le navigateur, l'utilisateur voit UNE seul page ➡️ `index.html`.
Ensuite, tout est gere par JavaScript Vanilla SPA ➡️ `Single Page Application`.
Le navigateur communique avec le server de deux facons :
- _REST API_ ➡️ requette HTTP classique (`login`, `profil`, ...).
- _WebSocket_ ➡️ connexion permanente en temps reel pour le jeu, le mode spectateur et le chat.

---

__🚦 Nginx__

Nginx est le premier point d'entree de toute les requetes. Il ecoute sur le port 8443 et redirige selon l'URL.
Il gere egalement le contract SSL : openssl s_client -connect localhost:8443 -servername localhost

---

__⚙️ Django__

Django recoit les requetes de Nginx et gere toute la logique.
Il est divise en plusieurs parties :


[users/view.py]:
- https://localhost:8443/api/users/me/                  ➡️ retourne le profil connecte en .JSON
- https://localhost:8443/accounts/                      ➡️ retourne le profil vu du template Django.
- https://localhost:8443/api/users/leaderboard/         ➡️ retourne le classement global en .JSON
- https://localhost:8443/admin/                         ➡️ retourne le portail de l'administration Django.
- https://localhost:8443/api/users/friends/             ➡️ retourne la liste d'ami du profil connecte en .JSON
- https://localhost:8443/api/users/friends/requests/    ➡️ retourne les demandes d'ami du profil en .JSON
- https://localhost:8443/api/users/search/              ➡️ retourne la page de recherche de profil en .JSON
- ...

[game/consumer.py]
- Gere les WebSocket : la boucle de jeu online tourne a 60 tick/s
- Recoit les inputs des joueurs, calcul les positions et renvoie l'etat.

[chat/consumer.py]
- Gere les WebSocket
- Recoit les messages, les sauvegarde et les redestribue a tous.

---

__🔌 Django Channels + Daphne__

Django de base ne sait pas gerer les WebSocket.
Django Channels ajoute cette capacite.
Daphne est le serveur qui fait tourner Django en mode 'ASGI' (asynchrone) pour que ca fonctionne.
- Navigateur ⬅️ __[WebSocket]__ ➡️ Nginx ➡️ Daphne ➡️ Django Channels.

---

__🗄️ PostgreSQL + Django ORM__

\\ _PostgrSQL_
- C'est la base donnees, elle stocke :
- users,   scores,   amis,   messages.

\\ _Django ORM_
- Permet d'ecrire en Python pour communique avec PostgrSQL.
- Exemple de code avec l'ORM de Django : *user = User.objects.get(username='user_name')*
- Exemple du meme code si on avait pas Django ORM : *SELECT * FROM users WHERE username = 'user_name'*

---

__🔑 OAuth 42 + Node.js__

Quand on se connect en cliquant sur le bouton [42] :

- 1. Navigateur ➡️ redirige vers api.intra.42.fr
- 2. L'intra 42 ➡️ redirige vers ton serveur avec un "code"
- 3. Nginx reçoit /accounts/... ➡️ redirige vers Node.js (port 3000)
- 4. Node.js échange le code contre un token avec l'API 42
- 5. Node.js récupère ton login + avatar depuis l'API 42
- 6. Node.js notifie Django pour créer/mettre à jour le compte
- 7. Node.js redirige le navigateur vers / avec login+avatar en paramètres

Node.js est utilise dans ce projet uniquement parce que la gestion OAuth etait plus simple à implementer qu'en Django pur.

---

__💾 localStorage / sessionStorage__

Stockage cote navigateur, sans passer par le serveur.

\\ _localStorage_ : persiste meme apres fermeture du navigateur.
- Utilise pour : pseudo, avatar, wins, losses, XP, historiaue des matchs

\\ _sessionStorage_ : Efface a la fermeture de l'onglet.
- Utilise pour : `matchmaking_active`, `active_room`.

`userStore.py` fait le pont entre les deux ➡️ il lit depuis l'API Django au demarrage et synchronise avec localStorage.

---

__🐳 Docker / Docker Compose__

Chaque service/technologie tourne dans un **container isole** :

```JS
docker-compose.yml
├── nginx      (port 8443) - reverse proxy SSL.
├── backend    (port 8000) - Django + Node.js (port 3000)
├── frontend   (port 8080) - Nginx servant les fichiers statiques HTML/JS/CSS 💡
├── db         (port 5432) - PostgreSQL
└── redis      (port 6379) - mémoire partagée pour Django Channels
```
💡 `Pas utilise directement car Nginx sert les fichiers du frontend en lisant directement les volumes.`

__Shema Global__

```JS
Navigateur:
    │
    │ HTTPS (Hypertext Transfer Protocol Secure) / WSS (WebSocket Secure)
    ▼
  Nginx :8443
    ├── /          → frontend (HTML/JS/CSS)
    ├── /api/      → Django :8000
    ├── /ws/       → Daphne :8000 (WebSocket)
    ├── /media/    → fichiers avatars
    └── /accounts/ → Node.js :3000
                          │
                    Django :8000
                          │
                    PostgreSQL :5432
                          │
                    Redis :6379
```


## Complet Stack

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
- C'est l'identifiant unique de chaque ligne dans la table.
- Genere automatiquement par la DB (1, 2, 3, 4...)
- Chaque table a une seule __PK__.
- Exemple : `UserProfile.id = 42` ➡️ il n'existe qu'un seul profil avec l'id 42
__FK__ = _Foreign Key_ :
- C'est une reference vers la __PK__ d'une autre table
- Cree un lien entre deux tables
- Exemple : `FriendRequest.sender_id = 42` ➡️ le sender est le user dont l'id est 42


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


# File review (en)

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

- main.js                                 — Bootstrap: initializes userStore, declares MapsTo, router, and global functions.

- utils/Routes.js                         — Defines all routes (/, /game, /profile, etc.) with their render() and init() methods.
- utils/State.js                          — Shared global state: currentPongInstance, isOnline, globalChatWS, lockNav, unlockNav.
- utils/userStore.js                      — Abstraction layer between localStorage and Django API: get, set, recordMatch, logout.
- utils/Pong.js                           — Classic local game: initPongGame + startGameLogic.
- utils/ModeGame.js                       — Octagon mode game: initModeGame + startGameModeLogic with power-ups.
- utils/OnlinePong.js                     — Online game via WebSocket: initOnlinePong.
- utils/settings.js                       — Settings page: paddle color, AI difficulty, account deletion.

- components/Navbar.js                    — navbar rendering

- - __Infrastructure__

- nginx/nginx.conf                        — Reverse proxy: redirects /api/ to Django, /ws/ to Channels, and everything else to the frontend.
- docker-compose.yml                      — Orchestrates the 3 containers: frontend (Nginx), backend (Django+Daphne), and db (PostgreSQL).
- Makefile                                — Shortcuts: make up, make down, make logs, etc.



# File review (fr)

- - __Backend__ (backend/src/)

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



- - __Frontend__ (frontend/src/)

- main.js                                 — bootstrap : init userStore, déclare navigateTo, router, fonctions globales

- utils/Routes.js                         — définit toutes les routes (/, /game, /profile, etc.) avec leur render() et init()
- utils/State.js                          — état global partagé : currentPongInstance, isOnline, globalChatWS, lockNav, unlockNav
- utils/userStore.js                      — abstraction localStorage ↔ API Django : get, set, recordMatch, logout
- utils/Pong.js                           — jeu local classique : initPongGame + startGameLogic
- utils/ModeGame.js                       — jeu mode octogone : initModeGame + startGameModeLogic avec bonus
- utils/OnlinePong.js                     — jeu online via WebSocket : initOnlinePong
- utils/settings.js                       — page settings : couleur raquette, difficulté IA, suppression compte

- components/Navbar.js                    — rendu de la navbar



- - __Infrastructure__

- nginx/nginx.conf                        — reverse proxy : redirige /api/ vers Django, /ws/ vers Channels, le reste vers le frontend
- docker-compose.yml                      — orchestre les 3 containers : frontend (nginx), backend (Django+Daphne), db (PostgreSQL)
- Makefile                                — raccourcis : make up, make down, make logs, etc.



















## Database & Django Commands

__🐳 Accès aux containers__
```bash
# Entrer dans le container backend
docker compose exec backend bash

# Entrer dans le container base de données
docker compose exec db psql -U db_user -d transcendence_db
```

__🗄️ PostgreSQL — naviguer dans la base de donnees__
```bash
# Lister toutes les tables
\dt

# Voir la structure d'une table
\d users_userprofile

# Voir tous les utilisateurs
SELECT id, username, email FROM auth_user;

# Voir tous les profils
SELECT * FROM users_userprofile;

# Voir les demandes d'amis
SELECT * FROM users_friendrequest;

# Voir les messages du chat
SELECT * FROM chat_message ORDER BY timestamp DESC LIMIT 10;

# Quitter psql
\q
```

__⚙️ Django — commandes utiles__
```bash
# Appliquer les migrations
docker compose exec backend python3 src/manage.py migrate

# Créer de nouvelles migrations
docker compose exec backend python3 src/manage.py makemigrations

# Accéder au shell Django (Python interactif avec accès aux modèles)
docker compose exec backend python3 src/manage.py shell

# Créer un superuser manuellement
docker compose exec backend python3 src/manage.py createsuperuser

# Voir toutes les routes disponibles
docker compose exec backend python3 src/manage.py show_urls