// import
import { userStore, getCsrfToken } from './utils/userStore.js';
import { initOnlinePong } from './utils/OnlinePong.js';
import { letCurrentPongInstance, returnCurrentPongInstance, unlockNav, lockNavAdmin } from './utils/State.js';
import { routes } from './utils/Routes.js';

// OAuth 42
const UID      = 'u-s4t2ud-ca92bf4d5bd6937ac2295ecb335d4eb51dc7a9a1e0d5554f8555fdc4c7c2c597';
const CALLBACK = encodeURIComponent('https://localhost:8443/accounts/fortytwo/login/callback/');
const authUrl  = `https://api.intra.42.fr/oauth/authorize?client_id=${UID}&redirect_uri=${CALLBACK}&response_type=code`;

const urlParams     = new URLSearchParams(window.location.search);
const avatarFromUrl = urlParams.get('avatar');
const loginFromUrl  = urlParams.get('login');
if (avatarFromUrl) await userStore.set('user_avatar', avatarFromUrl);
if (loginFromUrl)  await userStore.set('user_name',   loginFromUrl);

window.logout = async () => {
    try {
        await fetch('/api/users/logout/', {
            method: 'POST', credentials: 'include',
            headers: { 'X-CSRFToken': getCsrfToken() } 
        });
    } catch(e) {}
    currentUser = null;
    localStorage.removeItem('user_data');
    await userStore.logout();
    navigateTo('/');
};

console.log("Script main.js chargé !");

let currentUser         = null;
let globalChatWS        = null;

export let tournamentState = {
    isActive: false, players: [], matches: [], currentMatchIndex: 0
};

// Leaderboard
export async function loadLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;
    try {
        const res = await fetch('/api/users/leaderboard/', { credentials: 'include' });
        const data = await res.json();
        const myName = userStore.get('user_name', '');

        container.innerHTML = data.leaderboard.map(p => {
            const isMe = p.username === myName;
            const rankClass = p.rank <= 3 ? `rank-${p.rank}` : '';
            const rankIcon = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`;

            return `
            <div class="leaderboard-item ${isMe ? 'is-me' : ''}">
                <div class="rank-badge ${rankClass}">${rankIcon}</div>
                
                <div class="user-info">
                    <img src="${p.avatar}" class="leaderboard-avatar">
                    <span class="username">${p.username} ${isMe ? '<span class="me-tag">TOI</span>' : ''}</span>
                </div>

                <div class="stats-group">
                    <div class="stat-unit">
                        <span class="stat-val win">${p.wins}W</span>
                        <span class="stat-val loss">${p.losses}L</span>
                    </div>
                    <div class="stat-unit perc">${p.winrate}%</div>
                    <div class="stat-unit xp">${p.xp} <small>XP</small></div>
                </div>
            </div>`;
        }).join('') || '<p class="empty-msg">Aucun joueur pour le moment.</p>';
    } catch (err) {
        container.innerHTML = '<p class="empty-msg">Erreur de chargement du classement.</p>';
    }
}

// spectateur mode

export function initSpectatorMode(roomId) {
    const canvas = document.getElementById('pongCanvas');
    if (!canvas) return;
    const ctx      = canvas.getContext('2d');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws       = new WebSocket(`${protocol}//${window.location.host}/ws/game/${roomId}/`);

    let state = null, animId = null;

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
            case 'spectator_joined':
                document.getElementById('spec-status').innerText = '👁️ Spectateur connecté — en attente du début...';
                break;
            case 'game_start':
                state = data.state;
                document.getElementById('spec-status').style.display = 'none';
                canvas.style.display = 'block';
                if (!animId) animId = requestAnimationFrame(renderLoop);
                break;
            case 'game_tick':
                state = data.state;
                break;
            case 'game_over':
                if (animId) cancelAnimationFrame(animId);
                navigateTo('/game');
                break;
            case 'player_left':
                if (animId) cancelAnimationFrame(animId);
                alert('Un joueur a quitté la partie.');
                navigateTo('/game');
                break;
            case 'error':
                alert(data.message); navigateTo('/game'); break;
        }
    };

    ws.onerror = () => { alert('Erreur de connexion.'); navigateTo('/game'); };
    window.addEventListener('popstate', () => { ws.close(); if (animId) cancelAnimationFrame(animId); }, { once: true });

    function renderLoop() {
        if (!state) return;
        drawSpectator(state);
        animId = requestAnimationFrame(renderLoop);
    }

    function drawSpectator(s) {
        const PW = 10, PH = 80;
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#050810');
        gradient.addColorStop(0.5, '#0a0f1a');
        gradient.addColorStop(1, '#050810');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, 0);
        ctx.lineTo(canvas.width/2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // score
        ctx.textAlign = 'center';
        ctx.font = 'bold 48px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillText(s.left.score,  canvas.width/4,       70);
        ctx.fillText(s.right.score, (canvas.width/4) * 3, 70);

        // Nom
        ctx.font = '13px monospace';
        ctx.fillStyle = '#00babc';
        ctx.fillText(s.left.name,  canvas.width/4,       95);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(s.right.name, (canvas.width/4) * 3, 95);

        // raquettes
        // <-
        ctx.shadowBlur = 15; ctx.shadowColor = '#00babc'; ctx.fillStyle = '#00babc';
        ctx.beginPath();
        ctx.roundRect(s.left.x, s.left.y, PW, PH, [4,4,4,4]);
        ctx.fill();
        // ->
        ctx.shadowColor = '#fff'; ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.roundRect(s.right.x, s.right.y, PW, PH, [4,4,4,4]);
        ctx.fill();

        // ballle
        ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 20; ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.ball.x, s.ball.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}
//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////
export function initBouncingBalls() {
    const canvas = document.getElementById('pong-canvas-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
    const colors = ['#00babc', '#ff0055', '#fdf900', '#02ff17', '#9b59b6', '#e67e22', '#f1c40f'];
    const balls = Array.from({ length: 400}, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        dx: (Math.random() - 0.5) * 5, 
        dy: (Math.random() - 0.5) * 5,
        radius: Math.random() * 4 + 1,
        color: colors[Math.floor(Math.random() * colors.length)]
    }));

    function animate() {
        if (!document.body.contains(canvas)) {
            window.removeEventListener('resize', resize);
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        balls.forEach(b => {
            if (b.x + b.radius > canvas.width || b.x - b.radius < 0) b.dx *= -1;
            if (b.y + b.radius > canvas.height || b.y - b.radius < 0) b.dy *= -1;
            b.x += b.dx;
            b.y += b.dy;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = b.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = b.color;
            ctx.fill();
            ctx.closePath();
        });
        requestAnimationFrame(animate);
    }
    animate();
}


//////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////
// tournoi =
export function initTournamentLogic() {
    const btnStart = document.getElementById('btn-start-t');
    if (btnStart) btnStart.onclick = () => {
        const p1 = document.getElementById('tp1').value || "A";
        const p2 = document.getElementById('tp2').value || "B";
        const p3 = document.getElementById('tp3').value || "C";
        const p4 = document.getElementById('tp4').value || "D";
        tournamentState = {
            isActive: true, isMatchRunning: false, players: [p1,p2,p3,p4],
            matches: [{p1,p2,winner:null},{p1:p3,p2:p4,winner:null},{p1:null,p2:null,winner:null}],
            currentMatchIndex: 0
        };
        router();
    };
    const btnPlay = document.getElementById('btn-play-match');
    if (btnPlay) btnPlay.onclick = () => { tournamentState.isMatchRunning = true; navigateTo('/tournament-game'); };
    const btnCancel = document.getElementById('btn-cancel-t');
    if (btnCancel) btnCancel.onclick = () => {
        if (confirm("Annuler le tournoi ?")) {
            tournamentState.isActive = false; tournamentState.isMatchRunning = false; router();
        }
    };
}

// routeur =
const router = async () => {
    console.log("Routeur appelé pour :", window.location.pathname);
    const path  = window.location.pathname;
    const route = routes[path] || routes['/404'];
    const isLoggedIn = await checkAuth();
    updateNavbar();
    if (path === '/game' && !isLoggedIn) { navigateTo('/jouer-denied'); return; }
    if (path === '/chat' && !isLoggedIn) { navigateTo('/chat-denied');  return; }
    if (path === '/profile' && !isLoggedIn) { navigateTo('/profil-denied');  return; }
    if (path === '/tournament' && !isLoggedIn) { navigateTo('/tournament-denied');  return; }
    if (path === '/settings' && !isLoggedIn) { navigateTo('/settings-denied');  return; }
    if (path === '/leaderboard' && !isLoggedIn) { navigateTo('/leaderboard-denied');  return; }
    if (path === '/tournament-game' && !isLoggedIn) { navigateTo('/tournament-denied'); return; }
    document.title = `Transcendence - ${route.title}`;
    const appContainer = document.getElementById('app');
    if (appContainer) appContainer.innerHTML = route.render();
    renderAuthUI(isLoggedIn);
    if (route.init && typeof route.init === 'function') route.init();
};

//auth =
async function checkAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const login     = urlParams.get('login');
    const avatar    = urlParams.get('avatar');
    if (login && avatar) {
        try {
            const res = await fetch('/api/users/oauth-login/', {
                method:'POST', credentials:'include',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ username: login, avatar }),
            });
            if (res.ok) {
                const data = await res.json();
                currentUser = { username: data.username, avatar: data.avatar, wins: data.wins, losses: data.losses };
                await userStore.init();
                localStorage.setItem('user_data', JSON.stringify(currentUser));
            }
        } catch (err) {
            console.warn('[checkAuth] oauth-login échoué', err);
            currentUser = { username: login, avatar };
            localStorage.setItem('user_data', JSON.stringify(currentUser));
        }
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
    }
    const savedUser = localStorage.getItem('user_data');
    if (savedUser) { currentUser = JSON.parse(savedUser); return true; }
    try {
        const response    = await fetch('/api/users/me/', { credentials: 'include' });
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
            currentUser = await response.json(); return true;
        }
    } catch (err) { console.warn('[checkAuth] API injoignable, mode offline'); }
    currentUser = null;
    return false;
}

// UI Auth ->
function renderAuthUI(isLoggedIn) {
    const container = document.getElementById('auth-status');
    if (!container) return;
    const name   = currentUser?.username || userStore.get('user_name');
    const avatar = userStore.get('user_avatar');
    if (isLoggedIn && name && avatar) {
        container.innerHTML = `
            <div class="pilot-profile">
                <div class="pilot-info">
                    <span class="pilot-label">PLAYER</span>
                    <span class="pilot-name">${name}</span>
                </div>
                <img src="${avatar}" class="pilot-avatar">
                <button onclick="logout(); return false;" class="btn-logout-cyber">EXIT</button>
            </div>`;
    } else {
        container.innerHTML = `<a href="${authUrl}" class="cyber-button">42</a>`;
    }
}

// Navigation V

async function cancelMatchmaking() {
    if (!sessionStorage.getItem('matchmaking_active')) return;
    sessionStorage.removeItem('matchmaking_active');
    try {
        await fetch('/api/game/matchmaking/cancel/', {
            method: 'POST', credentials: 'include',
            headers: { 'X-CSRFToken': getCsrfToken() }
        });
    } catch(e) {}
}

export function navigateTo(url) {
    const instance = returnCurrentPongInstance();
    if (instance) { 
        cancelAnimationFrame(instance); 
        letCurrentPongInstance(null); 
    }
    window.dispatchEvent(new Event('navigate-away'));
    history.pushState(null, null, url);
    router();
}

document.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href.startsWith('http')) return;
    if (href.startsWith('/admin')) return;
    if (href.startsWith('/')) {
        if (href.includes('/accounts/')) return;
        e.preventDefault();
        if (sessionStorage.getItem('matchmaking_active') && href !== '/game') {
            cancelMatchmaking();
        }
        if (sessionStorage.getItem('active_room') && href !== '/game') {
            unlockNav();
        }
        if (typeof tournamentState !== 'undefined') tournamentState.isMatchRunning = false;
        navigateTo(href);
    }
});
window.addEventListener('popstate', router);
router();

export function updateNavbar() {
    const btn = document.getElementById('admin-nav-btn');
    if (!btn) return;
    
    const isAdmin = userStore.get('is_staff') === 'true';
    btn.style.display = isAdmin ? 'block' : 'none';
    
    if (isAdmin) lockNavAdmin();
}

// profil
export async function initProfile() {
    const historyContainer = document.getElementById('match-history');
    const history = JSON.parse(localStorage.getItem('match_history') || '[]');
    if (history.length === 0) {
        historyContainer.innerHTML = '<p style="color:#8b949e">Aucun match joué pour le moment.</p>';
    } else {
        historyContainer.innerHTML = history.map(match => `
            <div class="match-item ${match.result === 'Victoire' ? 'match-win' : 'match-loss'}">
                <span>${match.date}</span>
                <strong>${match.result}</strong>
                <span>opponent : ${match.opponent || 'Inconnu'}</span>
                <span>Score: ${match.score}</span>
            </div>`).join('');
    }
    await loadFriends();
    await loadFriendRequests();
    const searchBtn   = document.getElementById('friend-search-btn');
    const searchInput = document.getElementById('friend-search-input');
    if (searchBtn) {
        searchBtn.onclick = () => searchUsers(searchInput.value.trim());
        searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') searchUsers(searchInput.value.trim()); });
    }
}

async function loadFriends() {
    const container = document.getElementById('friends-list');
    if (!container) return;
    try {
        const res  = await fetch('/api/users/friends/', { credentials: 'include' });
        const data = await res.json();
        if (data.friends.length === 0) {
            container.innerHTML = '<p style="color:#8b949e">Aucun ami pour le moment.</p>'; return;
        }
        container.innerHTML = data.friends.map(f => `
            <div class="friend-item" style="display:flex;align-items:center;gap:12px;padding:10px;border-bottom:1px solid #1e2330;">
                <img src="${f.avatar || `https://ui-avatars.com/api/?name=${f.username}&background=0D1117&color=00babc`}"
                     style="width:36px;height:36px;border-radius:50%;object-fit:cover;">
                <span style="flex:1;font-weight:700;">${f.username}</span>
                <span style="font-size:0.75rem;color:${f.is_online ? '#2ea043' : '#8b949e'}">
                    ${f.is_online ? '● En ligne' : '○ Hors ligne'}
                </span>
                <div style="display:flex;gap:6px;">
                    <button onclick="inviteFriendToGame('${f.username}')"
                        style="background:#ff0055;border:none;color:white;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:0.75rem;">
                        🎮 Inviter
                    </button>
                    <button onclick="removeFriend('${f.username}')"
                        style="background:none;border:1px solid #ff4d6d;color:#ff4d6d;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:0.75rem;">
                        Retirer
                    </button>
                </div>
            </div>`).join('');
    } catch (err) {
        container.innerHTML = '<p style="color:#8b949e">Impossible de charger les amis.</p>';
    }
}

async function loadFriendRequests() {
    const section = document.getElementById('friend-requests-section');
    const container = document.getElementById('friend-requests-list');
    if (!section || !container) return;
    try {
        const res  = await fetch('/api/users/friends/requests/', { credentials: 'include' });
        const data = await res.json();
        if (data.requests.length === 0) { section.style.display = 'none'; return; }
        section.style.display = 'block';
        container.innerHTML = data.requests.map(r => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px;border-bottom:1px solid #1e2330;">
                <img src="${r.avatar || `https://ui-avatars.com/api/?name=${r.username}&background=0D1117&color=00babc`}"
                     style="width:36px;height:36px;border-radius:50%;object-fit:cover;">
                <span style="flex:1;font-weight:700;">${r.username}</span>
                <button onclick="respondFriendRequest(${r.id}, 'accept')"
                    style="background:#2ea043;border:none;color:white;padding:4px 12px;border-radius:4px;cursor:pointer;margin-right:6px;">✓ Accepter</button>
                <button onclick="respondFriendRequest(${r.id}, 'reject')"
                    style="background:none;border:1px solid #8b949e;color:#8b949e;padding:4px 12px;border-radius:4px;cursor:pointer;">✕ Refuser</button>
            </div>`).join('');
    } catch (err) { section.style.display = 'none'; }
}

async function searchUsers(query) {
    const container = document.getElementById('search-results');
    if (!container || query.length < 2) return;
    try {
        const res  = await fetch(`/api/users/search/?q=${encodeURIComponent(query)}`, { credentials: 'include' });
        const data = await res.json();
        if (data.users.length === 0) { container.innerHTML = '<p style="color:#8b949e;font-size:0.85rem;">Aucun résultat.</p>'; return; }
        container.innerHTML = data.users.map(u => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px;border-bottom:1px solid #1e2330;">
                <img src="${u.avatar || `https://ui-avatars.com/api/?name=${u.username}&background=0D1117&color=00babc`}"
                     style="width:36px;height:36px;border-radius:50%;object-fit:cover;">
                <span style="flex:1;font-weight:700;">${u.username}</span>
                <span style="font-size:0.75rem;color:${u.is_online ? '#2ea043' : '#8b949e'};margin-right:10px;">
                    ${u.is_online ? '● En ligne' : '○ Hors ligne'}
                </span>
                <button onclick="sendFriendRequest('${u.username}')"
                    style="background:var(--cyan,#00babc);border:none;color:#000;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:0.8rem;font-weight:700;">
                    + Ajouter
                </button>
            </div>`).join('');
    } catch (err) { container.innerHTML = '<p style="color:#8b949e">Erreur de recherche.</p>'; }
}

// amis
async function sendFriendRequest(username) {
    try {
        const res  = await fetch('/api/users/friends/send/', {
            method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json','X-CSRFToken':getCsrfToken()},
            body: JSON.stringify({ username }),
        });
        const data = await res.json();
        alert(data.message || data.error);
    } catch (err) { alert('Erreur lors de l\'envoi de la demande.'); }
}

async function respondFriendRequest(requestId, action) {
    try {
        await fetch(`/api/users/friends/respond/${requestId}/`, {
            method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json','X-CSRFToken':getCsrfToken()},
            body: JSON.stringify({ action }),
        });
        await loadFriends();
        await loadFriendRequests();
    } catch (err) { alert('Erreur.'); }
}

async function removeFriend(username) {
    if (!confirm(`Retirer ${username} de tes amis ?`)) return;
    try {
        await fetch(`/api/users/friends/remove/${username}/`, {
            method:'DELETE', credentials:'include', headers:{'X-CSRFToken':getCsrfToken()},
        });
        await loadFriends();
    } catch (err) { alert('Erreur.'); }
}

async function inviteFriendToGame(username) {
    try {
        const res    = await fetch('/api/game/create/', {
            method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json','X-CSRFToken':getCsrfToken()}
        });
        const data   = await res.json();
        const roomId = data.room_id;
        alert(`Partage ce code à ${username} :\n\n${roomId}\n\nTu vas être redirigé vers le jeu.`);
        navigateTo('/game');
        setTimeout(() => {
            const gw = document.getElementById('pong-game-wrapper');
            const sc = document.getElementById('setup-container');
            if (gw && sc) { sc.style.display = 'none'; gw.style.display = 'block'; }
            initOnlinePong(roomId);
        }, 300);
    } catch (err) { alert('Erreur lors de la création de la room.'); }
}

//chat ->
export function initChat() {
    if (globalChatWS && globalChatWS.readyState === WebSocket.OPEN) globalChatWS.close();
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    messagesContainer.innerHTML = '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    globalChatWS = new WebSocket(`${protocol}//${window.location.host}/ws/chat/`);
    const ws = globalChatWS;

    ws.onopen = () => console.log('[Chat] WebSocket connecté, readyState:', ws.readyState);
    ws.onmessage = (event) => {
        const container = document.getElementById('chat-messages');
        if (!container) { ws.close(); return; }
        const data = JSON.parse(event.data);
        appendMessage(data.message, data.type === 'history');
    };
    ws.onerror = () => appendSystemMessage('Connexion au chat perdue.');
    ws.onclose = () => console.warn('[Chat] WebSocket fermé');
    window.addEventListener('popstate', () => { if (!document.getElementById('chat-messages')) ws.close(); });
    if (!form) return;
    form.onsubmit = (e) => {
        e.preventDefault();
        const content = input.value.trim();
        if (!content || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ content }));
        input.value = "";
    };

    function appendMessage(msg, isHistory = false) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        const myName = userStore.get('user_name', '');
        const isMe   = msg.sender === myName;
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isMe ? 'sent' : 'received'}`;
        if (isMe) msgDiv.style.background = '#00babc33';
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
        msgDiv.innerHTML = `
            <span class="sender"><strong>${msg.sender} :</strong></span>
            <span class="msg-text">${escapeHtml(msg.content)}</span>
            <span class="msg-time" style="font-size: 0.8rem; opacity: 0.7; margin-left: 20px;">
        ${time}
    </span>`;
        container.appendChild(msgDiv);
        if (!isHistory) container.scrollTop = container.scrollHeight;
    }

    function appendSystemMessage(text) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'message system';
        div.textContent = text;
        container.appendChild(div);
    }

    function escapeHtml(text) {
        return text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    }

    setTimeout(() => {
        const container = document.getElementById('chat-messages');
        if (container) container.scrollTop = container.scrollHeight;
    }, 100);
}

// fonctions globales 
window.sendFriendRequest    = sendFriendRequest;
window.respondFriendRequest = respondFriendRequest;
window.removeFriend         = removeFriend;
window.inviteFriendToGame   = inviteFriendToGame;
window.initOnlinePong       = initOnlinePong;










