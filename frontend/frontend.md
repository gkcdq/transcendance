# Frontend transcendence

## Role in the project

The frontend is a **Vanilla JS Single Page Application (SPA)**.
There is no framework (no React, no Vue), everything is written in plain JavaScript ES Modules.

The browser loads **one single HTML file** (`index.html`) and never reloads the page.
Navigation between routes, rendering, and all UI updates are handled entirely by JavaScript.

```
frontend/
├── index.html        - single HTML shell, never changes
├── style.css         - global styles
├── Mokoko.webp       - default avatar
├── src/
│   ├── main.js         - entry point: router, userStore init, global functions
│   └── utils/
│       ├── Routes.js      - all route definitions (render + init)
│       ├── State.js       - shared global state
│       ├── userStore.js   - localStorage ↔ Django API abstraction
│       ├── Pong.js        - classic local game
│       ├── ModeGame.js    - octagon mode game with power-ups
│       ├── OnlinePong.js  - online multiplayer via WebSocket
│       └── settings.js    - settings page logic
```

---

## How the SPA works

### index.html
The HTML file is a shell, it only contains the navbar and one `<div id="app">`.
Every page is rendered by JavaScript inside `#app`. The HTML never changes.

```html
<div id="app">
    <!-- content injected here by JS -->
</div>
```

### Router (main.js)
When the user clicks a link, the router intercepts the click, prevents the page reload,
updates the URL with `history.pushState()`, and renders the new page.

```
User clicks "/game"
    → router intercepts
    → history.pushState('/game')
    → Routes['/game'].render() → injects HTML into #app
    → Routes['/game'].init()  → attaches event listeners, starts game logic
```

### Route lifecycle
Each route in `Routes.js` has two methods:
- `render()` = returns the HTML string to inject into `#app`
- `init()` = runs after render: fetches data, attaches listeners, starts animations

---

## File by file

### `main.js` — Entry point
- Initializes `userStore` (loads user data from Django API or localStorage)
- Declares `navigateTo(path)` = the global navigation function
- Sets up the router (intercepts all `<a>` clicks, handles `popstate` for browser back/forward)
- Calls `updateNavbar()` to show/hide nav items based on login state and admin role
- Calls `lockNavAdmin()` when in the admin section

```js
// Example: navigate programmatically
navigateTo('/profile');

// Example: full reload (used after login to reset state)
window.location.href = '/';
```

---

### `Routes.js` = All routes
Defines every page of the application:

| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/game` | Game mode selection + rules panel |
| `/profile` | User profile (stats, match history, friends) |
| `/leaderboard` | Global ranking |
| `/chat` | Real-time global chat |
| `/tournament` | Tournament bracket |
| `/settings` | Profile settings (avatar, paddle color, password) |
| `/admin` | Admin portal link (bypasses router to Django admin) |

Each route renders HTML and runs its own `init()` to fetch data and attach listeners.

---

### `State.js` Shared global state
Holds values that need to be shared between different parts of the app without prop drilling.

```js
export let currentPongInstance = null;  // active game instance
export let isOnline = false;            // online game flag
export let globalChatWS = null;         // WebSocket connection for chat
export const lockNav = () => { ... };   // hide navbar links during game
export const unlockNav = () => { ... }; // restore navbar
```

---

### `userStore.js` = Data abstraction layer
The bridge between **localStorage** (fast, client-side) and the **Django API** (source of truth).

On startup, `userStore.init()` fetches the user profile from `/api/users/me/` and syncs it to localStorage. After that, reads come from localStorage (instant), writes go to both.

```js
userStore.get('username') // reads from localStorage
userStore.set('paddle_color', '#ff0000') // updates localStorage + API
userStore.recordMatch(win, data) // saves match result to Django
userStore.logout() // clears localStorage, calls /api/users/logout/
```

Keys stored in localStorage:
```
user_id, username, user_avatar, user_email,
wins, losses, xp, total_seconds,
paddle_color, ai_difficulty, is_staff,
match_history
```

`user_avatar` is intentionally NOT synced to localStorage to avoid stale cache —
it is always fetched from the API.

---

### `Pong.js` = Classic local game
1v1 Pong on the same keyboard. Runs entirely client-side on an HTML5 Canvas.

- `initPongGame()` — sets up canvas, players, score display
- `startGameLogic()` — the 60fps game loop (ball physics, paddle collision, scoring)
- Players: left paddle = `W/S`, right paddle = `↑/↓`
- First to 5 points wins

---

### `ModeGame.js` = Octagon mode
Advanced local game with an octagonal arena and a full power-up system.

**Arena**: 8-sided canvas with diagonal bounce physics
```
oW = canvas.width  * 0.3125   // 312px — diagonal offset X
oH = canvas.height * 0.25     // 187px — diagonal offset Y
```

**Power-ups** (bonus):
| ID | Effect |
|----|--------|
| `speed` | Increases ball speed |
| `canon` | Fires ball straight at full speed (ballSpeedY = 0, ballSpeedX = ±30) |
| `freeze` | Freezes opponent paddle for 3 seconds |
| `multiball` | Spawns decoy balls to confuse the opponent |

**Malus** (applied to opponent):
| ID | Effect |
|----|--------|
| `p2blockmovement` | Opponent paddle cannot move |
| `p2Inverse` | Opponent controls are inverted |
| `p2Invisible` | Ball becomes invisible when crossing midfield |
| `p2multiballs` | Opponent sees multiple balls, AI gets confused |

**AI opponent** behavior:
- Tracks ball X/Y position and moves toward intercept point
- Affected by all malus — each malus has specific AI confusion logic:
  - `p2blockmovement` → AI skips movement entirely
  - `p2Inverse` → AI picks a fixed wrong direction for 60–120 frames (`iaInverseConfusedFrames`)
  - `p2multiballs` → AI moves randomly when ball is in its half (`iaConfusedDir`)
  - `p2Invisible` → AI drifts sinusoidally when ball is far

**Canon bounce fix**: when `canonActive`, the octagon diagonal bounce uses saved
`normalSpeedX / normalSpeedY` instead of the angular formula (which gives 0 when `ballSpeedY = 0`).

---

### `OnlinePong.js` = Online multiplayer
Real-time 1v1 game via WebSocket. The game loop runs **server-side** (Django Channels, 60 tick/s).

```
Browser A                    Django Channels               Browser B
   │  connect /ws/game/room_42   │                              │
   │─────────────────────────────►│                              │
   │  { type: "input", key: "w" } │                              │
   │─────────────────────────────►│                              │
   │                              │  game_update { ball, p1, p2 }│
   │◄─────────────────────────────│─────────────────────────────►│
   │  render frame                │                              │  render frame
```

- `initOnlinePong(roomId)` — connects to WebSocket, sets up canvas and input listeners
- Sends player inputs to server on `keydown` / `keyup`
- Receives game state 60 times/second and renders it on canvas
- Handles spectator mode — same connection, no input sending

---

### `settings.js` = Settings page
Handles all user settings:
- **Avatar upload** - file input → POST to `/api/users/upload-avatar/` → updates img src directly
- **Paddle color** - color picker → `userStore.set('paddle_color', color)` → API update
- **AI difficulty** - select → `userStore.set('ai_difficulty', value)` → API update
- **Password change** - form → POST to `/api/users/me/password/`
- **Account deletion** - confirmation prompt → DELETE to `/api/users/delete/` → logout

---

## Docker setup

### Dockerfile
```dockerfile
FROM nginx:alpine
COPY . /var/www/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

The frontend container is a simple Nginx serving static files on port 80.
It is **not accessed directly**, the main Nginx reverse proxy (port 8443) reads the
frontend files via a shared Docker volume, so this container is mostly unused in production.

---

## Essential commands

### Container
```bash
# Enter the frontend container
docker compose exec frontend sh

# View mounted frontend files
docker compose exec frontend ls /var/www/html/

# View frontend logs
docker compose logs frontend
docker compose logs frontend --follow
```

### Debug in browser
```bash
# Check if JS modules are loading (browser console)
# Open: https://localhost:8443/
# F12 → Console → look for errors

# Check SPA routing
# Navigate to https://localhost:8443/game → should NOT reload the page
# Refresh on https://localhost:8443/game → should still work (try_files in nginx)

# Check WebSocket connection (browser console)
# Open: https://localhost:8443/game → start online game
# F12 → Network → WS tab → should see /ws/game/ connection

# Check localStorage content (browser console)
localStorage.getItem('username')
localStorage.getItem('wins')
Object.keys(localStorage)  // list all stored keys
localStorage.clear() // reset all stored data (forces re-fetch from API)
```

### Check API calls from frontend
```bash
# Test the API the frontend calls on load
curl -k https://localhost:8443/api/users/me/

# Test avatar upload
curl -k -X POST https://localhost:8443/api/users/upload-avatar/ \
  -H "Content-Type: multipart/form-data" \
  -F "avatar=@/path/to/image.png"
```

---

## Request flow - page load

```
1. Browser loads:   https://localhost:8443/
2. Nginx serves:    /var/www/html/index.html
3. Browser loads:   style.css + src/main.js (ES module)
4. main.js runs:    userStore.init() → GET /api/users/me/
5. Django returns:  { username, avatar, wins, ... }
6. userStore saves: data to localStorage
7. Router runs:     renders current route into #app
8. Navbar updates:  shows/hides links based on login state
```

## Request flow - navigation

```
1. User clicks:     <a href="/profile">
2. main.js catches: click event → preventDefault()
3. Router calls:    history.pushState('/profile')
4. Router runs:     Routes['/profile'].render() → injects HTML into #app
5. Router runs:     Routes['/profile'].init() → fetches profile data, renders stats
6. URL updates:     https://localhost:8443/profile (no page reload)
```