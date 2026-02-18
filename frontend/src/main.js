// Configuration OAuth 42
const UID = 'u-s4t2ud-32403f139f0bc0256990e7a5cc583e40d672918477978b43a7a03e3d93804de7';
const CALLBACK = encodeURIComponent('https://localhost:8443/accounts/fortytwo/login/callback/');
const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${UID}&redirect_uri=${CALLBACK}&response_type=code`;
const authBtnContainer = document.getElementById('auth-status');
if (authBtnContainer) {
    authBtnContainer.innerHTML = `<a href="${authUrl}" class="cyber-button">Connexion avec 42</a>`;
}
//////////////////////////////////////////////////////////////////////////////////////////////////////
// pour la pp
const urlParams = new URLSearchParams(window.location.search);
const avatarFromUrl = urlParams.get('avatar');
const loginFromUrl = urlParams.get('login');

if (avatarFromUrl) {
    localStorage.setItem('user_avatar', avatarFromUrl);
}
if (loginFromUrl) {
    localStorage.setItem('user_name', loginFromUrl);
}


////////////////////////////////////////////////////
// Pour le bouton exit
window.logout = function() {
    // 1. Suppression des identifiants
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_avatar');
    localStorage.removeItem('user_data');

    // 2. Remise à zéro des statistiques locales
    localStorage.setItem('pong_wins', '0');
    localStorage.setItem('pong_losses', '0');
    localStorage.setItem('pong_total_seconds', '0');
    localStorage.removeItem('match_history');

    // 3. Redirection vers l'accueil pour rafraîchir le routeur et l'UI
    window.location.href = '/'; 
};


///////////////////////////////////////////////////


console.log("Script main.js chargé !");
let currentPongInstance = null;
let isGameOver = false; 
let currentUser = null;
const playPageHTML = `
    <div class="game-container">
        <div id="game-controls">
            <button id="btn-start-game" class="cyber-button">Lancer la partie</button>
            <p id="game-status">En attente du joueur...</p>
        </div>
        <canvas id="pongCanvas" width="800" height="400" style="display:none;"></canvas>
    </div>
`;



let tournamentState = {
    isActive: false, 
    players: [],
    matches: [],
    currentMatchIndex: 0
};

const routes = {
    '/': { 
        title: 'Accueil', 
        render: () => {
            const wins = parseInt(localStorage.getItem('pong_wins') || 0);
            const losses = parseInt(localStorage.getItem('pong_losses') || 0);
            const totalSeconds = parseInt(localStorage.getItem('pong_total_seconds') || 0);
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;
            const timeStr = h > 0 ? `${h}h ${m}s` : `${m}m ${s}s`;

            const name = localStorage.getItem('user_name') || 'Milin';
            const color = localStorage.getItem('user_color') || '#00babc';

            return `
                <div class="hero-container">
                    <h1>Transcendence !</h1>
                    <p class="subtitle">🎾⚾🎾
                    
                    <div class="stats-dashboard">
                        <div class="stat-card">
                            <div class="stat-value">${wins + losses}</div>
                            <div class="stat-label">Matchs joués</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${timeStr}</div>
                            <div class="stat-label">Temps de jeu</div>
                        </div>
                        <a href="/profile" class="stat-card profile-link-card">
                            <div class="stat-value" style="color: #00babc">Profil</div>
                            <div class="stat-label">Historique →</div>
                        </a>
                    </div>
                </div>`;
        }
    },
    '/game': { 
        title: 'Jeu', 
        render: () => {
            if (tournamentState.isActive && tournamentState.isMatchRunning) {
                const m = tournamentState.matches[tournamentState.currentMatchIndex];
                return `<h2>Tournoi : ${m.p1} VS ${m.p2}</h2>` + playPageHTML;
            }
            const myName = localStorage.getItem('user_name') || 'Player';
            return `
                <div id="setup-container" style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
                    <h2 style="text-transform: uppercase; letter-spacing: 2px;">Pong Match</h2>
                    
                    <div id="amical-options" style="display: flex; flex-direction: column; gap: 25px; width: 320px;">
                        
                        <div class="category-block">
                            <h3 style="color: #00babc; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 10px; border-left: 3px solid #00babc; padding-left: 10px; letter-spacing: 1px;">Entraînement</h3>
                            <div class="setup-group" style="border: 1px solid #00babc; padding: 15px; border-radius: 8px; background: rgba(0, 186, 188, 0.05);">
                                <label style="color: #00babc; font-size: 0.7rem; display: block; margin-bottom: 5px; text-transform: uppercase; opacity: 0.8;">Votre Profil</label>
                                <input type="text" value="${myName}" readonly class="cyber-input readonly-input" style="width: 100%; margin-bottom: 10px; cursor: not-allowed; opacity: 0.8;">
                                <button id="btn-play-ia" class="cyber-button" style="width: 100%;">Player vs IA</button>
                            </div>
                        </div>

                        <div class="category-block">
                            <h3 style="color: #ffb921; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 10px; border-left: 3px solid #ffb921; padding-left: 10px; letter-spacing: 1px;">Local</h3>
                            <div class="setup-group" style="border: 1px solid #ffb921; padding: 15px; border-radius: 8px; background: rgba(247, 255, 0, 0.05);">
                                <label style="color: #ffb921; font-size: 0.7rem; display: block; margin-bottom: 5px; text-transform: uppercase; opacity: 0.8;">Joueur 1</label>
                                <input type="text" id="p1-fixed" value="${myName}" readonly class="cyber-input readonly-input" style="width: 100%; margin-bottom: 10px; cursor: not-allowed; opacity: 0.8;">
                                
                                <label style="color: #ffb921; font-size: 0.7rem; display: block; margin-bottom: 5px; text-transform: uppercase; opacity: 0.8;">Joueur 2</label>
                                <input type="text" id="p2-name" placeholder="Entrer son pseudo" class="cyber-input" style="width: 100%; margin-bottom: 15px;" autofocus>
                                
                                <button id="btn-play-friend" class="cyber-button" style="width: 100%; background: #ffb921;">1 VS 1</button>
                            </div>
                        </div>
                        <div class="category-block">
                            <h3 style="color: #ff0055; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 10px; border-left: 3px solid #ff0055; padding-left: 10px; letter-spacing: 1px;">Online</h3>
                            <div class="setup-group" style="border: 1px solid #ff0055; padding: 15px; border-radius: 8px; background: rgba(247, 255, 0, 0.05);">
                                <p style="color: #ff0055; font-size: 0.7rem; margin-bottom: 10px;">Défiez un joueur.</p>
                                <button id="btn-matchmaking" class="cyber-button" style="width: 100%; background: #ff0055  ;border-color: #ff0055; color: #050505;">Lancer la recherche</button>
                                <div id="mm-status" style="margin-top: 10px; font-size: 0.8rem; color: #ff0055; display:none;">
                                    <span class="loader-dots">Recherche en cours</span>
                                </div>
                        </div>
                </div>

                    </div>
                </div>
                
                <div id="pong-game-wrapper" style="display:none;">
                    ${playPageHTML}
                </div>`;
        }, 
        init: () => {
            if (tournamentState.isActive && tournamentState.isMatchRunning) {
                const m = tournamentState.matches[tournamentState.currentMatchIndex];
                initPongGame(m.p1, m.p2);
                return;
            }

            const btnIA = document.getElementById('btn-play-ia');
            const btnFriend = document.getElementById('btn-play-friend');
            const setupContainer = document.getElementById('setup-container');
            const gameWrapper = document.getElementById('pong-game-wrapper');

            if (btnIA && btnFriend) {
                btnIA.onclick = () => {
                    const name = localStorage.getItem('user_name') || "Joueur";
                    setupContainer.style.display = 'none';
                    gameWrapper.style.display = 'block';
                    initPongGame(name, "IA");
                };

                btnFriend.onclick = () => {
                    const name1 = localStorage.getItem('user_name') || "Joueur 1";
                    const name2 = document.getElementById('p2-name').value || "Invité";
                    setupContainer.style.display = 'none';
                    gameWrapper.style.display = 'block';
                    initPongGame(name1, name2); 
                };
            }
        }
    },
    '/404': {
        title: '404',
        render: () => `<h1>404</h1><p>MOUAHAHAHAHAHAHAHAHAHAH.</p>`
    },
    '/accounts/fortytwo/login/callback/': {
        title: 'Authentification',
        render: () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');

            if (code) {
                // On envoie le code au serveur qui attend sur le port 3000
                window.location.href = `http://localhost:3000/auth/42/callback?code=${code}`;
                return `<h1>Connexion à l'Intra réussie !</h1><p>Redirection vers le serveur...</p>`;
            }
            return `<h1>Erreur : Pas de code reçu de 42.</h1>`;
        }
    },
    '/chat': { 
        title: 'Chat', 
        render: () => `
            <div class="chat-container solo">
                <section class="chat-window">
                    <div id="chat-messages" class="chat-messages">
                        <div class="message system">Bienvenue dans le canal global.</div>
                    </div>
                    <form id="chat-form" class="chat-input-area">
                        <input type="text" id="chat-input" placeholder="Tapez votre message..." autocomplete="off">
                        <button type="submit" class="btn-send">Envoyer</button>
                    </form>
                </section>
            </div>`,
        init: initChat
    },
    '/settings': { 
        title: 'Paramètres', 
        render: () => `
            <div class="settings-container">
                <h2>Configuration du Joueur</h2>
                <form id="settings-form">
                    <div class="setting-group">
                        <label>Pseudo</label>
                        <input type="text" id="username-input" placeholder="Ton pseudo...">
                    </div>
                    
                    <div class="setting-group">
                        <label>Couleur de la raquette</label>
                        <div class="color-picker">
                            <input type="color" id="paddle-color" value="#00babc">
                        </div>
                    </div>

                    <div class="setting-group">
                        <label>Difficulté IA par défaut</label>
                        <select id="ai-difficulty">
                            <option value="0.3">Facile</option>
                            <option value="5">Normal</option>
                            <option value="8">Expert</option>
                        </select>
                    </div>

                    <button type="submit" class="btn-save">Enregistrer les modifications</button>
                </form>
                <div id="settings-msg"></div>
            </div>`,
        init: initSettings
        },
        '/tournament': { 
        title: 'Tournoi Local', 
        render: () => {
            if (!tournamentState.isActive) {
                return `
                    <div class="tournament-container">
                        <h1>Tournoi Local</h1>
                        <div class="setup-box">
                            <input type="text" id="tp1" placeholder="Joueur 1" class="t-input" value="">
                            <input type="text" id="tp2" placeholder="Joueur 2" class="t-input" value="">
                            <input type="text" id="tp3" placeholder="Joueur 3" class="t-input" value="">
                            <input type="text" id="tp4" placeholder="Joueur 4" class="t-input" value="">
                            <button id="btn-start-t" class="cyber-button">GÉNÉRER L'ARBRE</button>
                        </div>
                    </div>`;
            }

            const m = tournamentState.matches;
            const cur = tournamentState.currentMatchIndex;

            return `
                <div class="tournament-container">
                    <h1>Tableau du Tournoi</h1>
                    <div class="bracket-display">
                        <div class="bracket-column">
                            <div class="match-box ${cur === 0 ? 'active' : ''}">
                                <span class="p-name">${m[0].p1}</span>
                                <span class="vs-badge">VS</span>
                                <span class="p-name">${m[0].p2}</span>
                                ${m[0].winner ? `<small class="winner-text">Vainqueur: ${m[0].winner}</small>` : ''}
                            </div>
                            <div class="match-box ${cur === 1 ? 'active' : ''}">
                                <span class="p-name">${m[1].p1}</span>
                                <span class="vs-badge">VS</span>
                                <span class="p-name">${m[1].p2}</span>
                                ${m[1].winner ? `<small class="winner-text">Vainqueur: ${m[1].winner}</small>` : ''}
                            </div>
                        </div>
                        <div class="bracket-column">
                            <div class="match-box ${cur === 2 ? 'active' : ''}" style="border-width: 2px;">
                                <span class="p-name">${m[2].p1 || '???'}</span>
                                <span class="vs-badge">GRANDE FINALE</span>
                                <span class="p-name">${m[2].p2 || '???'}</span>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 40px;">
                        <button id="btn-play-match" class="cyber-button">LANCER LE MATCH EN COURS</button>
                        <button id="btn-cancel-t" style="background:none; border:none; color:#8b949e; cursor:pointer;">Annuler le tournoi</button>
                    </div>
                </div>`;
        },
        init: initTournamentLogic
    },
    '/profile': { 
        title: 'Profil Utilisateur', 
        render: () => {
            const name = localStorage.getItem('user_name') || 'Player';
            const avatar = localStorage.getItem('user_avatar') || `https://ui-avatars.com/api/?name=${name}&background=0D1117&color=00babc`;

            const wins = parseInt(localStorage.getItem('pong_wins') || 0);
            const losses = parseInt(localStorage.getItem('pong_losses') || 0);
            const color = localStorage.getItem('user_color') || '#00babc';

            const totalXP = (wins * 100) + (losses * 20);
            const level = Math.floor(totalXP / 1000) + 1;
            const currentXP = totalXP % 1000;
            const xpPercentage = (currentXP / 1000) * 100;

            return `
                <div class="profile-container">
                    <div class="profile-header">
                        <div class="profile-avatar" style="border-color: ${color}">
                            <img src="${avatar}" alt="Avatar" class="avatar-img">
                        </div>
                        <h2>${name}</h2>
                        <div class="level-badge">Niveau ${level}</div>
                    </div>

                    <div class="xp-section">
                        <div class="xp-info">
                            <span>${currentXP} / 1000 XP</span>
                            <span>Progression vers niveau ${level + 1}</span>
                        </div>
                        <div class="xp-bar-container">
                            <div class="xp-bar-fill" style="width: ${xpPercentage}%; background-color: ${color}"></div>
                        </div>
                    </div>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <span class="stat-value">${wins}</span>
                            <span class="stat-label">Victoires</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">${losses}</span>
                            <span class="stat-label">Défaites</span>
                        </div>
                    </div>

                    <h3>Historique des Matchs</h3>
                    <div id="match-history" class="match-history"></div>
                </div>`;
        },
        init: initProfile
    },
    '/jouer-denied': {
        title: 'Accès Refusé',
        render: () => `
            <div class="access-denied-container">
                <h1>🚫 Accès Interdit 🚫</h1>
                <div class="denied-actions">
                </div>
            </div>
            <p>Connecte-toi pour jouer 🎾 .</p>
            <a href="/" class="cyber-button secondary">Retour à l'accueil</a>
        `
    },
        '/chat-denied': {
        title: 'Accès Refusé',
        render: () => `
            <div class="access-denied-container">
                <h1>🚫 Accès Interdit 🚫</h1>
                <div class="denied-actions">
                </div>
            </div>
            <p>Connecte-toi pour envoyer des messages 📨.</p>
            <a href="/" class="cyber-button secondary">Retour à l'accueil</a>
        `
    }
};

function initTournamentLogic() {
    const btnStart = document.getElementById('btn-start-t');
    if (btnStart) {
        btnStart.onclick = () => {
            const p1 = document.getElementById('tp1').value || "A";
            const p2 = document.getElementById('tp2').value || "B";
            const p3 = document.getElementById('tp3').value || "C";
            const p4 = document.getElementById('tp4').value || "D";

            tournamentState = {
                isActive: true,
                isMatchRunning: false, 
                players: [p1, p2, p3, p4],
                matches: [
                    { p1: p1, p2: p2, winner: null },
                    { p1: p3, p2: p4, winner: null },
                    { p1: null, p2: null, winner: null }
                ],
                currentMatchIndex: 0
            };
            router(); 
        };
    }
    const btnPlay = document.getElementById('btn-play-match');
    if (btnPlay) {
        btnPlay.onclick = () => {
            tournamentState.isMatchRunning = true; 
            navigateTo('/game');
        };
    }
    const btnCancel = document.getElementById('btn-cancel-t');
    if (btnCancel) {
        btnCancel.onclick = () => {
            if (confirm("Annuler le tournoi ?")) {
                tournamentState.isActive = false;
                tournamentState.isMatchRunning = false;
                router(); 
            }
        };
    }
}

function renderBracket() {
    const setup = document.getElementById('tournament-setup');
    const bracket = document.getElementById('tournament-bracket');
    setup.style.display = 'none';
    bracket.style.display = 'block';

    const match = tournamentState.matches[tournamentState.currentMatchIndex];
    
    bracket.innerHTML = `
        <div class="bracket-view">
            <h3>Match en cours : ${tournamentState.currentMatchIndex < 2 ? 'Demi-finale' : 'FINALE'}</h3>
            <div class="vs-display">
                <span class="player-tag">${match.p1}</span> 
                <span class="vs">VS</span> 
                <span class="player-tag">${match.p2}</span>
            </div>
            <button onclick="launchTournamentGame()" class="btn-play-hero">LANCER LE MATCH</button>
        </div>
    `;
}

const router = async () => {
    console.log("Routeur appelé pour :", window.location.pathname);
    const path = window.location.pathname;
    const route = routes[path] || routes['/404'];
    const isLoggedIn = await checkAuth();
    if ((path === '/game' && !isLoggedIn)) {
        navigateTo('/jouer-denied');
        return;
    }
    if ((path === '/chat' && !isLoggedIn))
    {
        navigateTo('/chat-denied');
        return;
    }
    document.title = `Transcendence - ${route.title}`;
    const appContainer = document.getElementById('app');
    if (appContainer) {
        appContainer.innerHTML = route.render();
    }
    renderAuthUI(isLoggedIn);
    if (route.init && typeof route.init === 'function') {
        route.init();
    }
};




async function checkAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const login = urlParams.get('login');
    const avatar = urlParams.get('avatar');

    if (login && avatar) {
        currentUser = { username: login, avatar: avatar };
        localStorage.setItem('user_data', JSON.stringify(currentUser));
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
    }
    const savedUser = localStorage.getItem('user_data');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        return true;
    }
    try {
        const response = await fetch('/api/users/me/');
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
            currentUser = await response.json();
            return true;
        }
    } catch (err) {
        navigateTo('/404');
        // Serveur injoignable
    }

    currentUser = null;
    return false;
}










function renderAuthUI(isLoggedIn) {
    const container = document.getElementById('auth-status');
    if (!container) return;

    // On récupère les infos soit dans currentUser, soit dans le localStorage
    const name = currentUser?.username || localStorage.getItem('user_name');
    const avatar = currentUser?.avatar || localStorage.getItem('user_avatar');

    if (isLoggedIn && name && avatar) {
        // SI CONNECTÉ : On affiche tout, y compris le bouton EXIT
        container.innerHTML = `
            <div class="pilot-profile">
                <div class="pilot-info">
                    <span class="pilot-label">PLAYER SYSTEM</span>
                    <span class="pilot-name">${name}</span>
                </div>
                <img src="${avatar}" class="pilot-avatar">
                <button onclick="logout(); return false;" class="btn-logout-cyber">EXIT</button>
            </div>
        `;
    } else {
        // SI DÉCONNECTÉ : On affiche le bouton de connexion 42
        const UID = 'u-s4t2ud-32403f139f0bc0256990e7a5cc583e40d672918477978b43a7a03e3d93804de7';
        const CALLBACK = encodeURIComponent('https://localhost:8443/accounts/fortytwo/login/callback/');
        const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${UID}&redirect_uri=${CALLBACK}&response_type=code`;
        
        container.innerHTML = `<a href="${authUrl}" class="cyber-button">Connexion avec 42</a>`;
    }
}





















function navigateTo(url) {
    if (currentPongInstance) {
        cancelAnimationFrame(currentPongInstance);
        currentPongInstance = null;
    }
    history.pushState(null, null, url);
    router();
}
document.addEventListener('click', e => {
    const link = e.target.closest('a'); 
    if (!link) return;
    const href = link.getAttribute('href');
    if (href.startsWith('http')) {
        return; 
    }

    if (href.startsWith('/')) {
        if (href.includes('/accounts/')) return;

        e.preventDefault();

        if (typeof tournamentState !== 'undefined') {
            tournamentState.isMatchRunning = false;
        }

        navigateTo(href);
    }
});

window.addEventListener('popstate', router);
document.addEventListener('DOMContentLoaded', router);

function initProfile() {
    const historyContainer = document.getElementById('match-history');
    const history = JSON.parse(localStorage.getItem('match_history') || '[]');

    if (history.length === 0) {
        historyContainer.innerHTML = '<p style="color: #8b949e">Aucun match joué pour le moment.</p>';
        return;
    }

    historyContainer.innerHTML = history.map(match => `
        <div class="match-item ${match.result === 'Victoire' ? 'match-win' : 'match-loss'}">
            <span>${match.date}</span>
            <strong>${match.result}</strong>
            <span>Score: ${match.score}</span>
        </div>
    `).join('');
}








function initPongGame(p1Name = "Player", p2Name = "IA") {
    const savedName = localStorage.getItem('user_name');
    if (savedName && p1Name === "Player")
    {
        p1Name = savedName;
    }
    const savedName2 = localStorage.getItem('user_name');
    if (savedName2 && p1Name === "Player")
    {
        p2Name = savedName;
    }
    const btnStart = document.getElementById('btn-start-game');
    const canvas = document.getElementById('pongCanvas');
    const statusText = document.getElementById('game-status');
    if (!canvas || !btnStart) return;
    const ctx = canvas.getContext('2d');
    statusText.innerText = `${p1Name} VS ${p2Name}`;
    btnStart.style.display = 'inline-block';
    canvas.style.display = 'none';

    btnStart.onclick = () => {
        btnStart.style.display = 'none'; 
        statusText.style.display = 'none';
        canvas.style.display = 'block';  
        startGameLogic(p1Name, p2Name); 
    };

    function startGameLogic(name1, name2) {
        let startTime = Date.now();
        let isGameOver = false;
        let animationId;
        const isTournament = (tournamentState.players.length > 0);
        const userColor = localStorage.getItem('user_color') || '#00babc';
        const aiBaseSpeed = parseFloat(localStorage.getItem('ai_level')) || 5.3;
        const paddleWidth = 10, paddleHeight = 80;
        let leftPaddleY = (canvas.height - paddleHeight) / 2;
        let rightPaddleY = (canvas.height - paddleHeight) / 2;
        let ballX = canvas.width / 2, ballY = canvas.height / 2;
        let ballSpeedX = 15, ballSpeedY = 15;
        let score1 = 0;
        let score2 = 0;
        const keys = {};
        const handleKeyDown = e => keys[e.key] = true;
        const handleKeyUp = e => keys[e.key] = false;

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        function gameLoop() {
            if (isGameOver) return;
            update();
            draw();
            animationId = requestAnimationFrame(gameLoop);
            currentPongInstance = animationId;
        }

        function update() {
            if (keys['w'] && leftPaddleY > 0) leftPaddleY -= 7;
            if (keys['s'] && leftPaddleY < canvas.height - paddleHeight) leftPaddleY += 7;
            if (name2 === "IA") {
                let targetY = ballX > canvas.width / 2 && ballSpeedX > 0 ? ballY : canvas.height / 2;
                let centerPaddle = rightPaddleY + paddleHeight / 2;
                if (centerPaddle < targetY - 10) rightPaddleY += aiBaseSpeed;
                else if (centerPaddle > targetY + 10) rightPaddleY -= aiBaseSpeed;
            } else {
                if (keys['ArrowUp'] && rightPaddleY > 0) rightPaddleY -= 7;
                if (keys['ArrowDown'] && rightPaddleY < canvas.height - paddleHeight) rightPaddleY += 7;
            }
            ballX += ballSpeedX;
            ballY += ballSpeedY;
            if (ballY <= 0 || ballY >= canvas.height) ballSpeedY = -ballSpeedY;
            const maxSpeed = 20;
            if (ballSpeedX < 0 && ballX <= paddleWidth) {
                if (ballY > leftPaddleY && ballY < leftPaddleY + paddleHeight) {
                    ballX = paddleWidth;
                    ballSpeedX = Math.min(Math.abs(ballSpeedX) * 1.1, maxSpeed);
                }
            }
            if (ballSpeedX > 0 && ballX >= canvas.width - paddleWidth) {
                if (ballY > rightPaddleY && ballY < rightPaddleY + paddleHeight) {
                    ballX = canvas.width - paddleWidth;
                    ballSpeedX = -Math.min(Math.abs(ballSpeedX) * 1.1, maxSpeed);
                }
            }
            if (ballX < 0) {
                score2++;
                if (score2 >= 5) endGame(name2);
                else resetBall();
            } else if (ballX > canvas.width) {
                score1++;
                if (score1 >= 5) endGame(name1);
                else resetBall();
            }
        }
        //////////////////////////////////




        /////////////////////////////
function endGame(winnerName) {
            if (isGameOver) return;
            isGameOver = true;
            let sessionSeconds = Math.floor((Date.now() - startTime) / 1000);
            let totalTime = parseInt(localStorage.getItem('pong_total_seconds') || '0');
            localStorage.setItem('pong_total_seconds', totalTime + sessionSeconds);
            cancelAnimationFrame(animationId);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            const myName = localStorage.getItem('user_name') || 'Player';
            const isVictory = (winnerName === myName);
            if (!tournamentState.isActive) {
                let currentXP = parseInt(localStorage.getItem('user_xp') || '0');
                let xpGained = isVictory ? 100 : 20;
                localStorage.setItem('user_xp', currentXP + xpGained);
                let wins = parseInt(localStorage.getItem('pong_wins') || '0');
                let losses = parseInt(localStorage.getItem('pong_losses') || '0');

                if (isVictory) {
                    localStorage.setItem('pong_wins', wins + 1);
                } else {
                    localStorage.setItem('pong_losses', losses + 1);
                }
                let history = JSON.parse(localStorage.getItem('match_history') || '[]');
                history.unshift({
                    date: new Date().toLocaleString(),
                    result: isVictory ? "Victoire" : "Défaite",
                    score: `${score1} - ${score2}`,
                    opponent: name2 
                });
                localStorage.setItem('match_history', JSON.stringify(history.slice(0, 10)));
                alert(`Match terminé ! Vainqueur : ${winnerName}`);
                navigateTo('/profile');
            } 
            else {
                tournamentState.matches[tournamentState.currentMatchIndex].winner = winnerName;

                if (tournamentState.currentMatchIndex === 0) {
                    tournamentState.matches[2].p1 = winnerName; 
                    tournamentState.currentMatchIndex = 1;      
                    alert(`Fin du match ! ${winnerName} passe en finale.`);
                    navigateTo('/tournament');
                } 
                else if (tournamentState.currentMatchIndex === 1) {
                    tournamentState.matches[2].p2 = winnerName; 
                    tournamentState.currentMatchIndex = 2;   
                    alert(`Fin du match ! ${winnerName} rejoint la finale.`);
                    navigateTo('/tournament');
                } 
                else if (tournamentState.currentMatchIndex === 2) {
                    alert(`🏆 INCROYABLE ! ${winnerName} REMPORTE LE TOURNOI ! 🏆`);
                    tournamentState.isActive = false; 
                    navigateTo('/tournament'); 
                }
            }
        }

        function resetBall() {
            ballX = canvas.width / 2;
            ballY = canvas.height / 2;
            ballSpeedX = (Math.random() > 0.5 ? 15 : -15);
            ballSpeedY = (Math.random() > 0.5 ? 15 : -15); 
        }
        function draw() {
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "white";
            ctx.font = "20px Arial";
            ctx.fillText(`${name1}: ${score1}`, canvas.width / 4, 30);
            ctx.fillText(`${name2}: ${score2}`, (canvas.width / 4) * 3, 30);
            
            ctx.fillStyle = userColor;
            ctx.fillRect(0, leftPaddleY, paddleWidth, paddleHeight);
            ctx.fillRect(canvas.width - paddleWidth, rightPaddleY, paddleWidth, paddleHeight);
            ctx.beginPath();
            ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        gameLoop();
    }
}




















async function fetchUserSettings() {
    const settingsContainer = document.getElementById('profile-settings');
    if (!settingsContainer || !currentUser) return;
    
    settingsContainer.innerHTML = `
        <p>Email : ${currentUser.email || 'Non renseigné'}</p>
        <p>Stats : ${currentUser.wins || 0}W / ${currentUser.losses || 0}L</p>
    `;
}
function initChat() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('chat-messages');

    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        if (input.value.trim() === "") return;

        // Création du message local
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message sent';
        msgDiv.style.background = '#00babc33';
        msgDiv.style.alignSelf = 'flex-end';
        msgDiv.innerHTML = `<span class="sender">Moi:</span> ${input.value}`;
        
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        input.value = "";
    };
}
function initSettings() {
    const form = document.getElementById('settings-form');
    const msg = document.getElementById('settings-msg');
    document.getElementById('username-input').value = localStorage.getItem('user_name') || 'Player';
    document.getElementById('paddle-color').value = localStorage.getItem('user_color') || '#00babc';
    document.getElementById('ai-difficulty').value = localStorage.getItem('ai_level') || '5.5';
    form.onsubmit = (e) => {
        e.preventDefault();
        const newName = document.getElementById('username-input').value;
        const newColor = document.getElementById('paddle-color').value;
        const newDifficulty = document.getElementById('ai-difficulty').value;
        localStorage.setItem('user_name', newName);
        localStorage.setItem('user_color', newColor);
        localStorage.setItem('ai_level', newDifficulty);
        msg.innerHTML = '<p style="color: #2ea043; margin-top: 15px;">Configuration mise à jour avec succès !</p>';
    };
}