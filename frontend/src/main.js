// ─── Import userStore ────────────────────────────────────────────────────────
import { userStore } from './utils/userStore.js';
await userStore.init();

// ─── OAuth 42 ────────────────────────────────────────────────────────────────
const UID      = 'u-s4t2ud-32403f139f0bc0256990e7a5cc583e40d672918477978b43a7a03e3d93804de7';
const CALLBACK = encodeURIComponent('https://localhost:8443/accounts/fortytwo/login/callback/');
const authUrl  = `https://api.intra.42.fr/oauth/authorize?client_id=${UID}&redirect_uri=${CALLBACK}&response_type=code`;

const urlParams     = new URLSearchParams(window.location.search);
const avatarFromUrl = urlParams.get('avatar');
const loginFromUrl  = urlParams.get('login');
if (avatarFromUrl) await userStore.set('user_avatar', avatarFromUrl);
if (loginFromUrl)  await userStore.set('user_name',   loginFromUrl);

let isOnline = 0;

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
let currentPongInstance = null;
let currentUser         = null;
let globalChatWS        = null;

const playPageHTML = `
    <div class="game-container">
        <div id="game-controls">
            <button id="btn-start-game" class="cyber-button">Lancer la partie</button>
            <p id="game-status">En attente du joueur...</p>
        </div>
        <canvas id="pongCanvas" width="1200" height="650" style="display:none;"></canvas>
    </div>
`;

let tournamentState = {
    isActive: false, players: [], matches: [], currentMatchIndex: 0
};

// ─── Routes ──────────────────────────────────────────────────────────────────
const routes = {

    '/': {
        title: 'Accueil',
        render: () => {
            const wins         = parseInt(userStore.get('pong_wins', 0));
            const losses       = parseInt(userStore.get('pong_losses', 0));
            const name = userStore.get('user_name');
            const avatar = userStore.get('user_avatar');
            const color  = userStore.get('user_color', '#00babc');
            // pour l'xp 
            const totalXP      = (wins * 100) + (losses * 20);
            const level        = Math.floor(totalXP / 1000) + 1;
            // pour le grade
            const tab_grade = ["Novice", "Novice confirme" ,"Novice expert" ,"Novice next plus ultra"];
            let grade = tab_grade[0];
            if (level - 1 == 1)
                grade = tab_grade[1];
            if (level - 1 == 2)
                grade = tab_grade[2];
            if (level - 1 >= 3)
                grade = tab_grade[3];
            if (name == null) {
                return `
                    <canvas id="pong-canvas-bg"></canvas>
                    <div class="hero-container" style="position:relative; z-index:1;">
                        <div class="home-profile-header">
                        <h1>Pong Game 🎾</h1>
                        <h5>📌 Connecte-toi pour jouer 📌</h5>
                        </div>
                        <div class="pong-showcase">
                            <div class="pong-gif-mockup">
                                <div class="pong-animation-lite">
                                    <div class="paddle left"></div>
                                    <div class="ball-mid"></div>
                                    <div class="paddle right"></div>
                                </div>
                                <span class="badge-live">LIVE PREVIEW</span>
                            </div>
                            <div class="pong-controls-guide">
                                <h3>Des règles simples :</h3>
                                <p class="subtitle">Une balle, deux raquettes, un seul vainqueur.</p>
                            </div>
                        </div>

                        <div style="display:flex; gap:16px; margin-top:30px; justify-content:center; flex-wrap:wrap;">
                            <a href="${authUrl}" class="cyber-button" style="display:flex; align-items:center; gap:10px; padding:12px 24px; font-size:0.95rem;">
                                <span style="font-size:1.2rem;">🎓</span> Connexion avec 42
                            </a>
                            <button id="btn-show-login" class="cyber-button" style="background:none; border:1px solid #00babc; color:#00babc; padding:12px 24px; font-size:0.95rem; display:flex; align-items:center; gap:10px;">
                                <span style="font-size:1.2rem;">🔑</span> Connexion / Inscription
                            </button>
                        </div>

                        <!-- Formulaire login/register caché par défaut -->
                        <div id="auth-form-container" style="display:none; margin-top:30px; max-width:360px; width:100%; margin-left:auto; margin-right:auto;">
                            <div style="border:1px solid #30363d; border-radius:8px; padding:30px; background:rgba(13,17,23,0.95); backdrop-filter:blur(10px);">
                                
                                <!-- Onglets -->
                                <div style="display:flex; gap:0; margin-bottom:24px; border-bottom:1px solid #30363d;">
                                    <button id="tab-login" style="flex:1; background:none; border:none; border-bottom:2px solid #00babc; color:#00babc; padding:10px; cursor:pointer; font-size:0.9rem; font-weight:700;">Connexion</button>
                                    <button id="tab-register" style="flex:1; background:none; border:none; border-bottom:2px solid transparent; color:#8b949e; padding:10px; cursor:pointer; font-size:0.9rem;">Inscription</button>
                                </div>

                                <!-- Login -->
                                <div id="form-login">
                                    <div style="margin-bottom:14px;">
                                        <label style="color:#8b949e; font-size:0.72rem; text-transform:uppercase; display:block; margin-bottom:6px;">Email ou Pseudo</label>
                                        <input type="text" id="login-username" class="cyber-input" style="width:100%;" placeholder="ton@email.com">
                                    </div>
                                    <div style="margin-bottom:20px;">
                                        <label style="color:#8b949e; font-size:0.72rem; text-transform:uppercase; display:block; margin-bottom:6px;">Mot de passe</label>
                                        <input type="password" id="login-password" class="cyber-input" style="width:100%;" placeholder="••••••••">
                                    </div>
                                    <button id="btn-login" class="cyber-button" style="width:100%;">Se connecter</button>
                                    <div id="login-msg" style="margin-top:12px; font-size:0.82rem; text-align:center;"></div>
                                </div>

                                <!-- Register (caché par défaut) -->
                                <div id="form-register" style="display:none;">
                                    <div style="margin-bottom:14px;">
                                        <label style="color:#8b949e; font-size:0.72rem; text-transform:uppercase; display:block; margin-bottom:6px;">Pseudo</label>
                                        <input type="text" id="reg-username" class="cyber-input" style="width:100%;" placeholder="TonPseudo">
                                    </div>
                                    <div style="margin-bottom:14px;">
                                        <label style="color:#8b949e; font-size:0.72rem; text-transform:uppercase; display:block; margin-bottom:6px;">Email</label>
                                        <input type="email" id="reg-email" class="cyber-input" style="width:100%;" placeholder="ton@email.com">
                                    </div>
                                    <div style="margin-bottom:14px;">
                                        <label style="color:#8b949e; font-size:0.72rem; text-transform:uppercase; display:block; margin-bottom:6px;">Mot de passe</label>
                                        <input type="password" id="reg-password" class="cyber-input" style="width:100%;" placeholder="••••••••">
                                    </div>
                                    <div style="margin-bottom:20px;">
                                        <label style="color:#8b949e; font-size:0.72rem; text-transform:uppercase; display:block; margin-bottom:6px;">Confirmer</label>
                                        <input type="password" id="reg-confirm" class="cyber-input" style="width:100%;" placeholder="••••••••">
                                    </div>
                                    <button id="btn-register" class="cyber-button" style="width:100%;">Créer le compte</button>
                                    <div id="reg-msg" style="margin-top:12px; font-size:0.82rem; text-align:center;"></div>
                                </div>
                            </div>
                        </div>
                    </div>`;
            }
            else
            {
                const chatSection = avatar ? `
                <div class="home-chat-section" style="width:100%;margin-top:40px;border-top:1px solid rgb(4, 163, 168);padding-top:20px;">
                    <h3 style="text-align:left;font-size:0.8rem;text-transform:uppercase;letter-spacing:2px;color:#8b949e;margin-bottom:15px;">Canal Global</h3>
                    <div class="chat-container solo" style="max-width:100%;width:100%;height:300px;">
                        <section class="chat-window" style="height:100%;">
                            <div id="chat-messages" class="chat-messages" style="height:200px;">
                                <div class="message system">Bienvenue dans le canal global.</div>
                            </div>
                            <form id="chat-form" class="chat-input-area">
                                <input type="text" id="chat-input" placeholder="Tapez votre message..." autocomplete="off">
                                <button type="submit" class="btn-send">Envoyer</button>
                            </form>
                        </section>
                    </div>
                </div>` : '';
                return `
                            <canvas id="pong-canvas-bg"></canvas>

                            <div class="hero-container" style="position:relative; z-index:1;">
                                <div class="home-profile-header">
                                <h4>${name}</h4>
                                    ${avatar ? `<img src="${avatar}" class="home-avatar-img" style="border-color:${color}">` : ''}
                                    <div class="level-badge">Niveau ${level - 1}</div>
                                    <h5>👑 Grade : ${grade} 👑</h5>
                                    <h1>Pong Game 🎾</h1>
                                </div>
                                <div class="pong-showcase">
                                    <div class="pong-gif-mockup">
                                        <div class="pong-animation-lite">
                                            <div class="paddle left"></div>
                                            <div class="ball-mid"></div>
                                            <div class="paddle right"></div>
                                        </div>
                                        <span class="badge-live">LIVE PREVIEW</span>
                                    </div>
                                    <div class="pong-controls-guide">
                                        <h3>Reminder :</h3>
                                        <p class="subtitle">Une balle, deux raquettes, un seul vainqueur.</p>
                                        <div class="controls-grid">
                                            <div class="player-keys">
                                            <div>
                                                <p>Local Game : Raquette Gauche ⤵</p>
                                            </div>
                                                <div class="keys"><span class="key">W</span> <span class="key">S</span></div>
                                            </div>
                                            <div class="divider"></div>
                                            <div class="player-keys">
                                                <p>Local Game : Raquette Droite ⤵</p>
                                                <div class="keys"><span class="key">↑</span> <span class="key">↓</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="stats-dashboard">
                                    <div class="stat-card">
                                        <div class="stat-value">${wins + losses}</div>
                                        <div class="stat-label">Matchs joués</div>
                                    </div>
                                    <a href="/game" class="stat-card play-link-card">
                                        <div class="stat-value" style="color:#ff0055">Play</div>
                                        <div class="stat-label">Lancer une partie →</div>
                                    </a>
                                </div>
                                ${chatSection}
                            </div>`;
                    }
                },
                init: () => {
                    initBouncingBalls();
                    if (document.getElementById('chat-form')) initChat();

                    // Bouton afficher formulaire
                    const btnShow = document.getElementById('btn-show-login');
                    if (!btnShow) return;
                    btnShow.onclick = () => {
                        const container = document.getElementById('auth-form-container');
                        container.style.display = container.style.display === 'none' ? 'block' : 'none';
                    };

                    // Onglets
                    const tabLogin    = document.getElementById('tab-login');
                    const tabRegister = document.getElementById('tab-register');
                    const formLogin   = document.getElementById('form-login');
                    const formReg     = document.getElementById('form-register');

                    tabLogin.onclick = () => {
                        formLogin.style.display = 'block'; formReg.style.display = 'none';
                        tabLogin.style.borderBottomColor = '#00babc'; tabLogin.style.color = '#00babc';
                        tabRegister.style.borderBottomColor = 'transparent'; tabRegister.style.color = '#8b949e';
                    };
                    tabRegister.onclick = () => {
                        formReg.style.display = 'block'; formLogin.style.display = 'none';
                        tabRegister.style.borderBottomColor = '#00babc'; tabRegister.style.color = '#00babc';
                        tabLogin.style.borderBottomColor = 'transparent'; tabLogin.style.color = '#8b949e';
                    };

                    // Login
                    const doLogin = async () => {
                        const username = document.getElementById('login-username').value.trim();
                        const password = document.getElementById('login-password').value;
                        const msg      = document.getElementById('login-msg');
                        if (!username || !password) { msg.innerHTML = '<span style="color:#ff4d6d;">Remplis tous les champs.</span>'; return; }
                        try {
                            const res  = await fetch('/api/users/login/', {
                                method: 'POST', credentials: 'include',
                                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                                body: JSON.stringify({ username, password }),
                            });
                            const data = await res.json();
                            if (res.ok) {
                                await userStore.set('user_name',   data.username);
                                await userStore.set('user_avatar', data.avatar);
                                localStorage.setItem('user_data', JSON.stringify({ username: data.username, avatar: data.avatar }));
                                navigateTo('/');
                            } else {
                                msg.innerHTML = `<span style="color:#ff4d6d;">${data.error}</span>`;
                            }
                        } catch (e) { msg.innerHTML = '<span style="color:#ff4d6d;">Erreur réseau.</span>'; }
                    };
                    document.getElementById('btn-login').onclick = doLogin;
                    document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

                    // Register
                    document.getElementById('btn-register').onclick = async () => {
                        const username = document.getElementById('reg-username').value.trim();
                        const email    = document.getElementById('reg-email').value.trim();
                        const password = document.getElementById('reg-password').value;
                        const confirm  = document.getElementById('reg-confirm').value;
                        const msg      = document.getElementById('reg-msg');
                        if (!username || !password || !email) { msg.innerHTML = '<span style="color:#ff4d6d;">Remplis tous les champs.</span>'; return; }
                        if (password !== confirm) { msg.innerHTML = '<span style="color:#ff4d6d;">Mots de passe différents.</span>'; return; }
                        if (password.length < 6)  { msg.innerHTML = '<span style="color:#ff4d6d;">6 caractères minimum.</span>'; return; }
                        try {
                            const res  = await fetch('/api/users/register/', {
                                method: 'POST', credentials: 'include',
                                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                                body: JSON.stringify({ username, email, password }),
                            });
                            const data = await res.json();
                            if (res.ok) {
                                msg.innerHTML = '<span style="color:#2ea043;">✅ Compte créé ! Connexion...</span>';
                                await userStore.set('user_name',   data.username);
                                await userStore.set('user_avatar', data.avatar);
                                localStorage.setItem('user_data', JSON.stringify({ username: data.username, avatar: data.avatar }));
                                setTimeout(() => navigateTo('/'), 1200);
                            } else {
                                msg.innerHTML = `<span style="color:#ff4d6d;">${data.error}</span>`;
                            }
                        } catch (e) { msg.innerHTML = '<span style="color:#ff4d6d;">Erreur réseau.</span>'; }
                    };
                }
            },
    '/game': {
        title: 'Jeu',
        render: () => {
            const myName = userStore.get('user_name', 'Player');
            return `
                <canvas id="pong-canvas-bg"></canvas>
                <div id="setup-container" style="display:flex;flex-direction:column;align-items:center;gap:20px;">
                    <h2 style="text-transform:uppercase;letter-spacing:2px;">Pong Match</h2>
                    <div id="amical-options" style="display:flex;flex-direction:column;gap:25px;width:320px;">

                        <div class="category-block">
                            <h3 style="color:#00babc;font-size:0.9rem;text-transform:uppercase;margin-bottom:10px;border-left:3px solid #00babc;padding-left:10px;letter-spacing:1px;">Entraînement</h3>
                            <div class="setup-group" style="border:1px solid #00babc;padding:15px;border-radius:8px;background:rgba(0,186,188,0.05);">
                                <label style="color:#00babc;font-size:0.7rem;display:block;margin-bottom:5px;text-transform:uppercase;opacity:0.8;">Votre Profil</label>
                                <input type="text" value="${myName}" readonly class="cyber-input readonly-input" style="width:100%;margin-bottom:10px;cursor:not-allowed;opacity:0.8;">
                                <button id="btn-play-ia" class="cyber-button" style="width:100%;">Player vs IA</button>
                            </div>
                        </div>

                        <div class="category-block">
                            <h3 style="color:#ffb921;font-size:0.9rem;text-transform:uppercase;margin-bottom:10px;border-left:3px solid #ffb921;padding-left:10px;letter-spacing:1px;">Local</h3>
                            <div class="setup-group" style="border:1px solid #ffb921;padding:15px;border-radius:8px;background:rgba(247,255,0,0.05);">
                                <label style="color:#ffb921;font-size:0.7rem;display:block;margin-bottom:5px;text-transform:uppercase;opacity:0.8;">Joueur 1</label>
                                <input type="text" id="p1-fixed" value="${myName}" readonly class="cyber-input readonly-input" style="width:100%;margin-bottom:10px;cursor:not-allowed;opacity:0.8;">
                                <label style="color:#ffb921;font-size:0.7rem;display:block;margin-bottom:5px;text-transform:uppercase;opacity:0.8;">Joueur 2</label>
                                <input type="text" id="p2-name" placeholder="Entrer son pseudo" class="cyber-input" style="width:100%;margin-bottom:15px;" autofocus>
                                <button id="btn-play-friend" class="cyber-button" style="width:100%;background:#ffb921;">1 VS 1</button>
                            </div>
                        </div>

                        <div class="category-block">
                            <h3 style="color:#ff0055;font-size:0.9rem;text-transform:uppercase;margin-bottom:10px;border-left:3px solid #ff0055;padding-left:10px;letter-spacing:1px;">Online</h3>
                            <div class="setup-group" style="border:1px solid #ff0055;padding:15px;border-radius:8px;background:rgba(255,0,85,0.05);">
                                <p style="color:#ff0055;font-size:0.7rem;margin-bottom:10px;">Joue contre un adversaire en ligne.</p>
                                <button id="btn-matchmaking" class="cyber-button" style="width:100%;background:#ff0055;border-color:#ff0055;color:#050505;margin-bottom:10px;">🔍 Matchmaking</button>
                                <div id="mm-status" style="margin-top:8px;font-size:0.8rem;color:#ff0055;display:none;"></div>
                                <div style="border-top:1px solid rgba(255,0,85,0.2);padding-top:10px;margin-top:10px;">
                                    <label style="color:#ff0055;font-size:0.7rem;display:block;margin-bottom:5px;text-transform:uppercase;opacity:0.8;">Rejoindre une room</label>
                                    <input type="text" id="room-id-input" placeholder="Code de la room..." class="cyber-input" style="width:100%;margin-bottom:8px;">
                                    <button id="btn-join-room" class="cyber-button" style="width:100%;border-color:#ff0055;color:#ff0055;">Rejoindre</button>
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
            initBouncingBalls();
            const setupContainer = document.getElementById('setup-container');
            const gameWrapper    = document.getElementById('pong-game-wrapper');
            const activeRoom = sessionStorage.getItem('active_room');
            if (activeRoom) {
                const resume = confirm('Tu as un match en cours. Reprendre ?');
                if (resume) {
                    setupContainer.style.display = 'none';
                    gameWrapper.style.display    = 'block';
                    initOnlinePong(activeRoom);
                    return;
                } else {
                    sessionStorage.removeItem('active_room');
                }
            }
            const btnIA          = document.getElementById('btn-play-ia');
            const btnFriend      = document.getElementById('btn-play-friend');
            const btnMatchmaking = document.getElementById('btn-matchmaking');
            const btnJoin        = document.getElementById('btn-join-room');

            if (btnIA) btnIA.onclick = () => {
                setupContainer.style.display = 'none';
                gameWrapper.style.display    = 'block';
                initPongGame(userStore.get('user_name', 'Joueur'), "IA");
            };

            if (btnFriend) btnFriend.onclick = () => {
                const name2 = document.getElementById('p2-name').value || "Invité";
                setupContainer.style.display = 'none';
                gameWrapper.style.display    = 'block';
                initPongGame(userStore.get('user_name', 'Joueur 1'), name2);
            };

            if (btnMatchmaking) btnMatchmaking.onclick = async () => {
                const mmStatus = document.getElementById('mm-status');
                mmStatus.style.display = 'block';
                mmStatus.innerHTML = `<span style="color:#ff0055;">🔍 Recherche d'adversaire...</span>`;
                btnMatchmaking.disabled = true;

                // Poll toutes les 2 secondes
                const interval = setInterval(async () => {
                    try {
                        const res  = await fetch('/api/game/matchmaking/', {
                            method: 'POST', credentials: 'include',
                            headers: {'X-CSRFToken': getCsrfToken()}
                        });
                        const data = await res.json();

                        if (data.status === 'matched') {
                            clearInterval(interval);
                            lockNav();
                            // Remplace tout le contenu par juste le canvas
                            const app = document.getElementById('app');
                            app.innerHTML = `
                                <canvas id="pong-canvas-bg"></canvas>
                                <div class="game-container" style="position:relative;z-index:1;">
                                    <canvas id="pongCanvas" width="1200" height="650"></canvas>
                                </div>`;
                            initBouncingBalls();
                            initOnlinePong(data.room_id);
                        } else {
                            // Toujours en attente — anime les points
                            const dots = '.'.repeat((Date.now() / 500 % 3 | 0) + 1);
                            mmStatus.innerHTML = `<span style="color:#ff0055;">🔍 Recherche${dots}</span>`;
                        }
                    } catch (e) {
                        clearInterval(interval);
                        btnMatchmaking.disabled = false;
                        mmStatus.innerHTML = `<span style="color:#ff4d6d;">Erreur réseau.</span>`;
                    }
                }, 2000);

                // Bouton annuler
                mmStatus.innerHTML += `<br><button id="btn-cancel-mm" style="background:none;border:none;color:#8b949e;cursor:pointer;margin-top:8px;font-size:0.8rem;">Annuler</button>`;
                setTimeout(() => {
                    const btnCancel = document.getElementById('btn-cancel-mm');
                    if (btnCancel) btnCancel.onclick = () => {
                        clearInterval(interval);
                        btnMatchmaking.disabled = false;
                        mmStatus.style.display = 'none';
                    };
                }, 100);
            };

            if (btnJoin) btnJoin.onclick = () => {
                const code = document.getElementById('room-id-input').value.trim();
                if (!code) return;
                setupContainer.style.display = 'none';
                gameWrapper.style.display    = 'block';
                initOnlinePong(code);
            };
        }
    },

    '/404': { title: '404', render: () => `<h1>404</h1><p>Invalid.</p>` },

    '/accounts/fortytwo/login/callback/': {
        title: 'Authentification',
        render: () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            if (code) {
                window.location.href = `http://localhost:3000/auth/42/callback?code=${code}`;
                return `<h1>Connexion à l'Intra réussie !</h1><p>Redirection...</p>`;
            }
            return `<h1>Erreur : Pas de code reçu de 42.</h1>`;
        }
    },

    '/chat': {
        title: 'Chat',
        render: () => `
        <canvas id="pong-canvas-bg"></canvas>
            <div class="chat-container solo">
                <section class="chat-window">
                    <div id="chat-messages" class="chat-messages">
                        <div class="message system">Canal Global</div>
                    </div>
                    <form id="chat-form" class="chat-input-area">
                        <input type="text" id="chat-input" placeholder="Tapez votre message..." autocomplete="off">
                        <button type="submit" class="btn-send">Envoyer</button>
                    </form>
                </section>
            </div>`,
            init: () => {
                initBouncingBalls();
                initChat();
            }
    },

    '/settings': {
        title: 'Paramètres',
        render: () => `
        <canvas id="pong-canvas-bg"></canvas>
            <div class="settings-container">
                <h2>Configuration du Joueur</h2>
                <form id="settings-form">
                    <div class="setting-group">
                        <label>Pseudo (Verrouillé)</label>
                        <input type="text" id="username-input" readonly style="background:rgba(255,255,255,0.05);cursor:not-allowed;border-color:rgba(255,255,255,0.1);color:#8b949e;">
                    </div>
                    <div class="setting-group">
                        <label>Couleur de la raquette</label>
                        <div class="color-picker"><input type="color" id="paddle-color" value="#00babc"></div>
                    </div>
                    <div class="setting-group">
                        <label>Difficulté IA par défaut</label>
                        <select id="ai-difficulty">
                            <option value="3">Facile</option>
                            <option value="5">Normal</option>
                            <option value="9">Expert</option>
                        </select>
                    </div>
                    <button type="submit" class="btn-save">Enregistrer les modifications</button>
                </form>
                <div id="settings-msg"></div>
            </div>`,
            init: () => {
                initBouncingBalls();
                initSettings();
            }
    },
    '/tournament': {
        title: 'Tournoi Local',
        render: () => {
            if (!tournamentState.isActive) {
                return `
                <canvas id="pong-canvas-bg"></canvas>
                    <div class="tournament-container">
                        <h1>Tournoi Local</h1>
                        <div class="setup-box">
                            <input type="text" id="tp1" placeholder="Joueur 1" class="t-input">
                            <input type="text" id="tp2" placeholder="Joueur 2" class="t-input">
                            <input type="text" id="tp3" placeholder="Joueur 3" class="t-input">
                            <input type="text" id="tp4" placeholder="Joueur 4" class="t-input">
                            <button id="btn-start-t" class="cyber-button">GÉNÉRER L'ARBRE</button>
                        </div>
                    </div>`;
            }
            const m   = tournamentState.matches;
            const cur = tournamentState.currentMatchIndex;
            return `
            <canvas id="pong-canvas-bg"></canvas>
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
                            <div class="match-box ${cur === 2 ? 'active' : ''}" style="border-width:2px;">
                                <span class="p-name">${m[2].p1 || '???'}</span>
                                <span class="vs-badge">GRANDE FINALE</span>
                                <span class="p-name">${m[2].p2 || '???'}</span>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:40px;">
                        <button id="btn-play-match" class="cyber-button">LANCER LE MATCH EN COURS</button>
                        <button id="btn-cancel-t" style="background:none;border:none;color:#8b949e;cursor:pointer;">Annuler le tournoi</button>
                    </div>
                </div>`;
        },
        init: () => {
            initBouncingBalls();
            initTournamentLogic();
        }
    },
    '/profile': {
            title: 'Profil Utilisateur',
            render: () => {
                const name   = userStore.get('user_name', 'Player');
                const avatar = userStore.get('user_avatar') || `https://ui-avatars.com/api/?name=${name}&background=0D1117&color=00babc`;
                const wins   = parseInt(userStore.get('pong_wins', 0));
                const losses = parseInt(userStore.get('pong_losses', 0));
                const color  = userStore.get('user_color', '#00babc');
                
                // calcul du temps de jeu
                const totalSeconds = parseInt(userStore.get('pong_total_seconds', 0));
                const h = Math.floor(totalSeconds / 3600);
                const m = Math.floor((totalSeconds % 3600) / 60);
                const s = totalSeconds % 60;
                const timeStr = h > 0 ? `${h}h ${m}s` : `${m}m ${s}s`;

                const totalXP      = (wins * 100) + (losses * 20);
                const level        = Math.floor(totalXP / 1000) + 1;
                const currentXP    = totalXP % 1000;
                const xpPercentage = (currentXP / 1000) * 100;

                return `
                <canvas id="pong-canvas-bg"></canvas>
                    <div class="profile-container">
                        <div class="profile-header">
                            <div class="profile-avatar" style="border-color:${color}">
                                <img src="${avatar}" alt="Avatar" class="avatar-img">
                            </div>
                            <h2>${name}</h2>
                            <div class="level-badge">Niveau ${level - 1}</div>
                        </div>
                        <div class="xp-section">
                            <div class="xp-info">
                                <span>${currentXP} / 1000 XP</span>
                                <span>Progression vers le niveau ${level}</span>
                            </div>
                            <div class="xp-bar-container">
                                <div class="xp-bar-fill" style="width:${xpPercentage}%;background-color:${color}"></div>
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
                            <div class="stat-card">
                                <span class="stat-value">${timeStr}</span>
                                <span class="stat-label">Temps de jeu</span>
                            </div>
                        </div>
                        
                        <h3>Historique des Matchs</h3>
                        <div id="match-history" class="match-history"></div>
                        
                        <div class="friends-section">
                            <h3>Amis</h3>
                            <div class="friend-search">
                                <input type="text" id="friend-search-input" placeholder="Rechercher un joueur..." class="cyber-input" style="width:70%;margin-right:10px;">
                                <button id="friend-search-btn" class="cyber-button" style="width:25%;">Rechercher</button>
                            </div>
                            <div id="search-results" style="margin-top:10px;"></div>
                            <div id="friend-requests-section" style="margin-top:20px;display:none;">
                                <h4 style="color:#ffb921;">Demandes reçues</h4>
                                <div id="friend-requests-list"></div>
                            </div>
                            <div style="margin-top:20px;">
                                <h4>Mes amis</h4>
                                <div id="friends-list"><p style="color:#8b949e">Chargement...</p></div>
                            </div>
                        </div>
                    </div>`;
            },
            init: () => {
                initBouncingBalls();
                initProfile(); // Appelle ta logique de profil (fetch amis, historique, etc.) // Lance l'animation des balles en arrière-plan
            }
        },

    '/jouer-denied': {
        title: 'Accès Refusé',
        render: () => `
            <div class="access-denied-container"><h1>🚫 Accès Interdit 🚫</h1><div class="denied-actions"></div></div>
            <p>Connecte-toi pour jouer 🎾.</p>
            <a href="/" class="cyber-button secondary">Retour à l'accueil</a>`
    },
    '/tournament-denied': {
        title: 'Accès Refusé',
        render: () => `
            <div class="access-denied-container"><h1>🚫 Accès Interdit 🚫</h1><div class="denied-actions"></div></div>
            <p>Connecte-toi pour lancer des tournois ⚔️.</p>
            <a href="/" class="cyber-button secondary">Retour à l'accueil</a>`
    },
    '/chat-denied': {
        title: 'Accès Refusé',
        render: () => `
            <div class="access-denied-container"><h1>🚫 Accès Interdit 🚫</h1><div class="denied-actions"></div></div>
            <p>Connecte-toi pour envoyer des messages 📨.</p>
            <a href="/" class="cyber-button secondary">Retour à l'accueil</a>`
    },
    '/profil-denied': {
        title: 'Accès Refusé',
        render: () => `
            <div class="access-denied-container"><h1>🚫 Accès Interdit 🚫</h1><div class="denied-actions"></div></div>
            <p>Connecte-toi pour voir ton profile 📜.</p>
            <a href="/" class="cyber-button secondary">Retour à l'accueil</a>`
    },
    '/leaderboard-denied': {
        title: 'Accès Refusé',
        render: () => `
            <div class="access-denied-container"><h1>🚫 Accès Interdit 🚫</h1><div class="denied-actions"></div></div>
            <p>Connecte-toi pour voir le classement 📊.</p>
            <a href="/" class="cyber-button secondary">Retour à l'accueil</a>`
    },
    '/settings-denied': {
        title: 'Accès Refusé',
        render: () => `
            <div class="access-denied-container"><h1>🚫 Accès Interdit 🚫</h1><div class="denied-actions"></div></div>
            <p>Connecte-toi pour modifier les parametres 🛠️.</p>
            <a href="/" class="cyber-button secondary">Retour à l'accueil</a>`
    },
    
    '/leaderboard': {
        title: 'Classement',
        render: () => `
        <canvas id="pong-canvas-bg"></canvas>
            <div style="max-width:700px; margin:0 auto;">
                <h2 style="text-transform:uppercase; letter-spacing:2px; text-align:center; margin-bottom:30px;">
                    🏆 Classement Global
                </h2>
                <div id="leaderboard-container">
                    <p style="color:#8b949e; text-align:center;">Chargement...</p>
                </div>
            </div>`,
        init: () => {initBouncingBalls(); loadLeaderboard();}
    },
    '/tournament-game': {
        title: 'Match Tournoi',
        render: () => {
            if (!tournamentState.isActive || !tournamentState.isMatchRunning) {
                navigateTo('/tournament');
                return '';
            }
            const m = tournamentState.matches[tournamentState.currentMatchIndex];
            return `
                <h2 style="text-align:center; margin-bottom:20px; text-transform:uppercase; letter-spacing:2px;">
                    ⚔️ ${m.p1} VS ${m.p2} ⚔️
                </h2>
                ${playPageHTML}`;
        },
        init: () => {
            if (!tournamentState.isActive || !tournamentState.isMatchRunning) return;
            const m = tournamentState.matches[tournamentState.currentMatchIndex];
            initPongGame(m.p1, m.p2);
        }
    },
    '/register': {
    title: 'Inscription',
    render: () => `
        <canvas id="pong-canvas-bg"></canvas>
        <div style="max-width:360px; margin:0 auto; position:relative; z-index:1;">
            <h2 style="text-align:center; text-transform:uppercase; letter-spacing:2px; margin-bottom:30px;">Créer un compte</h2>
            <div style="border:1px solid #30363d; border-radius:8px; padding:30px; background:rgba(22,27,34,0.9);">
                <div class="setting-group" style="margin-bottom:15px;">
                    <label style="color:#8b949e; font-size:0.75rem; text-transform:uppercase;">Pseudo</label>
                    <input type="text" id="reg-username" class="cyber-input" style="width:100%; margin-top:6px;" placeholder="Ton pseudo">
                </div>
                <div class="setting-group" style="margin-bottom:15px;">
                    <label style="color:#8b949e; font-size:0.75rem; text-transform:uppercase;">Mot de passe</label>
                    <input type="password" id="reg-password" class="cyber-input" style="width:100%; margin-top:6px;" placeholder="••••••••">
                </div>
                <div class="setting-group" style="margin-bottom:20px;">
                    <label style="color:#8b949e; font-size:0.75rem; text-transform:uppercase;">Confirmer</label>
                    <input type="password" id="reg-confirm" class="cyber-input" style="width:100%; margin-top:6px;" placeholder="••••••••">
                </div>
                <button id="btn-register" class="cyber-button" style="width:100%;">Créer le compte</button>
                <div id="reg-msg" style="margin-top:15px; font-size:0.85rem;"></div>
                <p style="text-align:center; margin-top:20px; color:#8b949e; font-size:0.8rem;">
                    Déjà un compte ? <a href="/login" style="color:#00babc;">Se connecter</a>
                </p>
            </div>
        </div>`,
    init: () => {
        initBouncingBalls();
        document.getElementById('btn-register').onclick = async () => {
            const username = document.getElementById('reg-username').value.trim();
            const password = document.getElementById('reg-password').value;
            const confirm  = document.getElementById('reg-confirm').value;
            const msg      = document.getElementById('reg-msg');
            if (!username || !password) { msg.innerHTML = '<span style="color:#ff4d6d;">Remplis tous les champs.</span>'; return; }
            if (password !== confirm)   { msg.innerHTML = '<span style="color:#ff4d6d;">Les mots de passe ne correspondent pas.</span>'; return; }
            if (password.length < 6)   { msg.innerHTML = '<span style="color:#ff4d6d;">Mot de passe trop court (6 min).</span>'; return; }
            try {
                const res  = await fetch('/api/users/register/', {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                    body: JSON.stringify({ username, password }),
                });
                const data = await res.json();
                if (res.ok) {
                    msg.innerHTML = '<span style="color:#2ea043;">Compte créé ! Redirection...</span>';
                    await userStore.set('user_name', data.username);
                    await userStore.set('user_avatar', data.avatar);
                    setTimeout(() => navigateTo('/'), 1500);
                } else {
                    msg.innerHTML = `<span style="color:#ff4d6d;">${data.error}</span>`;
                }
            } catch (e) { msg.innerHTML = '<span style="color:#ff4d6d;">Erreur réseau.</span>'; }
        };
    }
    },

    '/login': {
        title: 'Connexion',
        render: () => `
            <canvas id="pong-canvas-bg"></canvas>
            <div style="max-width:360px; margin:0 auto; position:relative; z-index:1;">
                <h2 style="text-align:center; text-transform:uppercase; letter-spacing:2px; margin-bottom:30px;">Connexion</h2>
                <div style="border:1px solid #30363d; border-radius:8px; padding:30px; background:rgba(22,27,34,0.9);">
                    <div class="setting-group" style="margin-bottom:15px;">
                        <label style="color:#8b949e; font-size:0.75rem; text-transform:uppercase;">Pseudo</label>
                        <input type="text" id="login-username" class="cyber-input" style="width:100%; margin-top:6px;" placeholder="Ton pseudo">
                    </div>
                    <div class="setting-group" style="margin-bottom:20px;">
                        <label style="color:#8b949e; font-size:0.75rem; text-transform:uppercase;">Mot de passe</label>
                        <input type="password" id="login-password" class="cyber-input" style="width:100%; margin-top:6px;" placeholder="••••••••">
                    </div>
                    <button id="btn-login" class="cyber-button" style="width:100%;">Se connecter</button>
                    <div id="login-msg" style="margin-top:15px; font-size:0.85rem;"></div>
                    <div style="text-align:center; margin-top:20px;">
                        <a href="${authUrl}" class="cyber-button" style="display:inline-block; font-size:0.85rem;">Connexion avec 42</a>
                    </div>
                    <p style="text-align:center; margin-top:15px; color:#8b949e; font-size:0.8rem;">
                        Pas de compte ? <a href="/register" style="color:#00babc;">S'inscrire</a>
                    </p>
                </div>
            </div>`,
        init: () => {
            initBouncingBalls();
            const doLogin = async () => {
                const username = document.getElementById('login-username').value.trim();
                const password = document.getElementById('login-password').value;
                const msg      = document.getElementById('login-msg');
                if (!username || !password) { msg.innerHTML = '<span style="color:#ff4d6d;">Remplis tous les champs.</span>'; return; }
                try {
                    const res  = await fetch('/api/users/login/', {
                        method: 'POST', credentials: 'include',
                        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                        body: JSON.stringify({ username, password }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                        await userStore.set('user_name',   data.username);
                        await userStore.set('user_avatar', data.avatar);
                        localStorage.setItem('user_data', JSON.stringify({ username: data.username, avatar: data.avatar }));
                        navigateTo('/');
                    } else {
                        msg.innerHTML = `<span style="color:#ff4d6d;">${data.error}</span>`;
                    }
                } catch (e) { msg.innerHTML = '<span style="color:#ff4d6d;">Erreur réseau.</span>'; }
            };
            document.getElementById('btn-login').onclick = doLogin;
            document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
        }
    },
};

// ─── Leaderboard ─────────────────────────────────────────────────────────────
async function loadLeaderboard() {
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
//////////////////////////////////////////////////////////////////////////////////////
function initBouncingBalls() {
    const canvas = document.getElementById('pong-canvas-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // On passe à 40 balles pour un effet de "pluie de néons"
    const colors = ['#00babc', '#ff0055', '#fdf900', '#02ff17', '#9b59b6', '#e67e22', '#f1c40f'];
    const balls = Array.from({ length: 200}, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        // On varie un peu plus les vitesses pour plus de dynamisme
        dx: (Math.random() - 0.5) * 5, 
        dy: (Math.random() - 0.5) * 5,
        radius: Math.random() * 4 + 1, // Des balles de tailles variées
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
            
            // Note : shadowBlur est gourmand en performance. 
            // Avec 40 balles, on le baisse un peu à 5 ou 8.
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
// ─── Tournoi ─────────────────────────────────────────────────────────────────
function initTournamentLogic() {
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

// ─── Routeur ─────────────────────────────────────────────────────────────────
const router = async () => {
    console.log("Routeur appelé pour :", window.location.pathname);
    const path  = window.location.pathname;
    const route = routes[path] || routes['/404'];
    const isLoggedIn = await checkAuth();
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

// ─── Auth ─────────────────────────────────────────────────────────────────────
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

// ─── UI Auth ──────────────────────────────────────────────────────────────────
function renderAuthUI(isLoggedIn) {
    const container = document.getElementById('auth-status');
    if (!container) return;
    const name   = currentUser?.username || userStore.get('user_name');
    const avatar = currentUser?.avatar   || userStore.get('user_avatar');
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

// ─── Navigation ───────────────────────────────────────────────────────────────
function lockNav() {
    document.querySelectorAll('.nav-links a').forEach(a => {
        a.style.pointerEvents = 'none';
        a.style.opacity = '0.3';
    });
    if (!document.getElementById('nav-match-badge')) {
        document.querySelector('.nav-links')?.insertAdjacentHTML('beforeend',
            `<li id="nav-match-badge" style="color:#ff0055;font-weight:bold;font-size:0.8rem;letter-spacing:1px;">🔴 MATCH EN COURS</li>`
        );
    }
}

function unlockNav() {
    sessionStorage.removeItem('active_room');
    document.querySelectorAll('.nav-links a').forEach(a => {
        a.style.pointerEvents = '';
        a.style.opacity = '';
    });
    document.getElementById('nav-match-badge')?.remove();
}

function navigateTo(url) {
    if (currentPongInstance) { cancelAnimationFrame(currentPongInstance); currentPongInstance = null; }
    history.pushState(null, null, url);
    router();
}

document.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href.startsWith('http')) return;
    if (href.startsWith('/')) {
        if (href.includes('/accounts/')) return;
        e.preventDefault();
        if (sessionStorage.getItem('active_room') && href !== '/game') {
            const leave = confirm('⚠️ Tu as un match en cours ! Quitter = forfait. Continuer ?');
            if (!leave) return;
            unlockNav();
        }
        if (typeof tournamentState !== 'undefined') tournamentState.isMatchRunning = false;
        navigateTo(href);
    }
});
window.addEventListener('popstate', router);
router();

// ─── Profil ───────────────────────────────────────────────────────────────────
async function initProfile() {
    const historyContainer = document.getElementById('match-history');
    const history          = JSON.parse(localStorage.getItem('match_history') || '[]');
    if (history.length === 0) {
        historyContainer.innerHTML = '<p style="color:#8b949e">Aucun match joué pour le moment.</p>';
    } else {
        historyContainer.innerHTML = history.map(match => `
            <div class="match-item ${match.result === 'Victoire' ? 'match-win' : 'match-loss'}">
                <span>${match.date}</span><strong>${match.result}</strong><span>Score: ${match.score}</span>
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
    const section   = document.getElementById('friend-requests-section');
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

// ─── CSRF ─────────────────────────────────────────────────────────────────────
function getCsrfToken() {
    const cookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
    return cookie ? cookie.split('=')[1] : '';
}

// ─── Amis ─────────────────────────────────────────────────────────────────────
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

// ─── Chat ─────────────────────────────────────────────────────────────────────
function initChat() {
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
            <span class="sender">${msg.sender}</span>
            <span class="msg-text">${escapeHtml(msg.content)}</span>
            <span class="msg-time">${time}</span>`;
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

// ─── Settings ─────────────────────────────────────────────────────────────────
function initSettings() {
    const form = document.getElementById('settings-form');
    const msg  = document.getElementById('settings-msg');
    document.getElementById('username-input').value = userStore.get('user_name', 'Player');
    document.getElementById('paddle-color').value   = userStore.get('user_color', '#00babc');
    document.getElementById('ai-difficulty').value  = userStore.get('ai_level', '5');
    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        await userStore.set('user_color', document.getElementById('paddle-color').value);
        await userStore.set('ai_level',   document.getElementById('ai-difficulty').value);
        msg.innerHTML = '<p style="color:#2ea043;margin-top:15px;">Préférences mises à jour (Pseudo conservé) !</p>';
    };
}

// ─── Pong Local ───────────────────────────────────────────────────────────────
function initPongGame(p1Name = "Player", p2Name = "IA") {
    const savedName = userStore.get('user_name');
    if (savedName && p1Name === "Player") p1Name = savedName;
    const btnStart   = document.getElementById('btn-start-game');
    const canvas     = document.getElementById('pongCanvas');
    const statusText = document.getElementById('game-status');
    if (!canvas || !btnStart) return;
    const ctx = canvas.getContext('2d');
    statusText.innerText   = `${p1Name} VS ${p2Name}`;
    btnStart.style.display = 'inline-block';
    canvas.style.display   = 'none';

    btnStart.onclick = () => {
        btnStart.style.display   = 'none';
        statusText.style.display = 'none';
        canvas.style.display     = 'block';
        startGameLogic(p1Name, p2Name);
    };

function startGameLogic(name1, name2) {
    let startTime  = Date.now();
    let isGameOver = false;
    let animationId;
    const userColor    = userStore.get('user_color', '#00babc');
    const aiBaseSpeed  = parseFloat(userStore.get('ai_level', '5.3')) || 5.3;
    const paddleWidth  = 10;
    const paddleHeight = 80;
    const PADDLE_MAX_X = canvas.width / 2 - paddleWidth; // limite milieu

    // Position X ET Y des raquettes
    let leftPaddleX  = 0;
    let leftPaddleY  = (canvas.height - paddleHeight) / 2;
    let rightPaddleX = canvas.width - paddleWidth;
    let rightPaddleY = (canvas.height - paddleHeight) / 2;

    let ballX = canvas.width / 2, ballY = canvas.height / 2;
    let ballSpeedX = 5, ballSpeedY = 5;
    let score1 = 0, score2 = 0;
    const keys = {};
    const handleKeyDown = e => {
        // Ne bloque que les touches de jeu, pas quand on tape dans un input
        if (['w','s','a','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
            if (document.activeElement.tagName !== 'INPUT') e.preventDefault();
        }
        keys[e.key] = true;
    };
    const handleKeyUp = e => keys[e.key] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup',   handleKeyUp);
    // Système de particules
    const particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5, speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4, opacity: Math.random() * 0.4 + 0.1,
    }));
    const ballTrail = [];

    function gameLoop() {
        if (isGameOver) return;
        update(); draw();
        animationId = requestAnimationFrame(gameLoop);
        currentPongInstance = animationId;
    }

    function update() {
        const speed = 7, hSpeed = 4;

        // Raquette gauche : W/S vertical, A/D horizontal (max jusqu'au milieu)
        if (keys['w'] && leftPaddleY > 0)                             leftPaddleY -= speed;
        if (keys['s'] && leftPaddleY < canvas.height - paddleHeight)  leftPaddleY += speed;
        if (keys['d'] && leftPaddleX < PADDLE_MAX_X)                  leftPaddleX += hSpeed;
        if (keys['a'] && leftPaddleX > 0)                             leftPaddleX -= hSpeed;

        if (name2 === "IA") {
            // IA : suit la balle en Y ET avance en X si la balle est proche
            const centerPaddle = rightPaddleY + paddleHeight / 2;
            const targetY = ballSpeedX > 0 ? ballY : canvas.height / 2;
            if (centerPaddle < targetY - 10) rightPaddleY += aiBaseSpeed;
            else if (centerPaddle > targetY + 10) rightPaddleY -= aiBaseSpeed;
            // IA avance vers la balle en X (mais ne dépasse pas le milieu)
            const targetX = ballSpeedX > 0
                ? Math.max(canvas.width - paddleWidth - PADDLE_MAX_X, ballX - 60)
                : canvas.width - paddleWidth;
            if (rightPaddleX > targetX + 3) rightPaddleX -= hSpeed * 0.6;
            else if (rightPaddleX < targetX - 3) rightPaddleX += hSpeed * 0.6;
            rightPaddleX = Math.max(canvas.width / 2, Math.min(canvas.width - paddleWidth, rightPaddleX));
        } else {
            // Joueur 2 : flèches haut/bas + gauche/droite
            if (keys['ArrowUp']    && rightPaddleY > 0)                            rightPaddleY -= speed;
            if (keys['ArrowDown']  && rightPaddleY < canvas.height - paddleHeight) rightPaddleY += speed;
            if (keys['ArrowLeft']  && rightPaddleX > canvas.width / 2)             rightPaddleX -= hSpeed;
            if (keys['ArrowRight'] && rightPaddleX < canvas.width - paddleWidth)   rightPaddleX += hSpeed;
        }

        ballX += ballSpeedX; ballY += ballSpeedY;
        if (ballY <= 0 || ballY >= canvas.height) ballSpeedY = -ballSpeedY;

        const maxSpeed = 20;

        // Collision raquette gauche (position X dynamique)
        // Collision raquette droite — détection par segment
        if (ballSpeedX > 0) {
            const prevBallX = ballX - ballSpeedX;
            if (prevBallX < rightPaddleX + paddleWidth && ballX >= rightPaddleX) {
                if (ballY + 6 > rightPaddleY && ballY - 6 < rightPaddleY + paddleHeight) {
                    ballX = rightPaddleX - 1;
                    ballSpeedX = -Math.min(Math.abs(ballSpeedX) * 1.1, maxSpeed);
                }
            }
        }

        // Collision raquette gauche — détection par segment
        if (ballSpeedX < 0) {
            const prevBallX = ballX - ballSpeedX;
            if (prevBallX > leftPaddleX && ballX <= leftPaddleX + paddleWidth) {
                if (ballY + 6 > leftPaddleY && ballY - 6 < leftPaddleY + paddleHeight) {
                    ballX = leftPaddleX + paddleWidth + 1;
                    ballSpeedX = Math.min(Math.abs(ballSpeedX) * 1.1, maxSpeed);
                }
            }
        }

        if (ballX < 0)                { score2++; if (score2 >= 5) endGame(name2); else resetBall(); }
        else if (ballX > canvas.width) { score1++; if (score1 >= 5) endGame(name1); else resetBall(); }
    }

        async function endGame(winnerName) {
            if (isGameOver) return;
            isGameOver = true;
            const sessionSeconds = Math.floor((Date.now() - startTime) / 1000);
            cancelAnimationFrame(animationId);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup',   handleKeyUp);

            const isTournamentMatch = tournamentState.isActive && window.location.pathname === '/tournament-game'; // ← CHANGE ICI
            const myName    = userStore.get('user_name', 'Player');
            const isVictory = (winnerName === myName);

            if (!isTournamentMatch) {  // ← CHANGE ICI
                await userStore.recordMatch({ isVictory, score1, score2, opponentName: name2, durationSeconds: sessionSeconds });
                alert(`Match terminé ! Vainqueur : ${winnerName}`);
                navigateTo('/profile');
            } else {
                const totalTime = parseInt(userStore.get('pong_total_seconds', 0));
                await userStore.set('pong_total_seconds', totalTime + sessionSeconds);
                tournamentState.matches[tournamentState.currentMatchIndex].winner = winnerName;
                if (tournamentState.currentMatchIndex === 0) {
                    tournamentState.matches[2].p1 = winnerName; tournamentState.currentMatchIndex = 1;
                    alert(`Fin du match ! ${winnerName} passe en finale.`); navigateTo('/tournament');
                } else if (tournamentState.currentMatchIndex === 1) {
                    tournamentState.matches[2].p2 = winnerName; tournamentState.currentMatchIndex = 2;
                    alert(`Fin du match ! ${winnerName} rejoint la finale.`); navigateTo('/tournament');
                } else if (tournamentState.currentMatchIndex === 2) {
                    alert(`🏆 INCROYABLE ! ${winnerName} REMPORTE LE TOURNOI ! 🏆`);
                    tournamentState.isActive = false; navigateTo('/tournament');
                }
            }
        }

        function resetBall() {
            ballX = canvas.width / 2; ballY = canvas.height / 2;
            ballSpeedX = (Math.random() > 0.5 ? 5 : -5);
            ballSpeedY = (Math.random() > 0.5 ? 5 : -5);
            leftPaddleX = 0;
            leftPaddleY  = (canvas.height - paddleHeight) / 2;
            rightPaddleX = canvas.width;
            rightPaddleY = (canvas.height - paddleHeight) / 2.5;
        }

        function draw() {
            // Fond avec dégradé subtil
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, '#050810');
            gradient.addColorStop(0.5, '#0a0f1a');
            gradient.addColorStop(1, '#050810');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Ligne centrale pointillée
            ctx.setLineDash([8, 8]);
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, 0);
            ctx.lineTo(canvas.width / 2, canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);

            // Scores
            ctx.textAlign = 'center';
            ctx.font = 'bold 48px monospace';
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillText(score1, canvas.width / 4,       70);
            ctx.fillText(score2, (canvas.width / 4) * 3, 70);

            // Noms des joueurs
            ctx.font = '13px monospace';
            ctx.letterSpacing = '2px';
            ctx.fillStyle = userColor;
            ctx.shadowColor = userColor;
            ctx.shadowBlur = 8;
            ctx.fillText(name1.toUpperCase(), canvas.width / 4,       20);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.fillText(name2.toUpperCase(), (canvas.width / 4) * 3, 20);
            ctx.shadowBlur = 0;

            // Raquette gauche avec glow
// Raquette gauche
        ctx.shadowColor = userColor; ctx.shadowBlur = 18;
        ctx.fillStyle = userColor;
        ctx.beginPath();
        ctx.roundRect(leftPaddleX, leftPaddleY, paddleWidth, paddleHeight, [4,4,4,4]);
        ctx.fill();

        // Raquette droite
        ctx.shadowColor = '#fff'; ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.roundRect(rightPaddleX, rightPaddleY, paddleWidth, paddleHeight, [4,4,4,4]);
        ctx.fill();

            // Balle avec glow
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ballX, ballY, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.textAlign = 'left';
        }

        gameLoop();
    }
}

// ─── Pong Online ──────────────────────────────────────────────────────────────
function initOnlinePong(roomId) {
    sessionStorage.setItem('active_room', roomId);
    isOnline = 1;
    const canvas     = document.getElementById('pongCanvas');
    const statusText = document.getElementById('game-status');
    const btnStart   = document.getElementById('btn-start-game');
    if (!canvas) return;
    if (btnStart) btnStart.style.display = 'none';
    canvas.style.display = 'block';
    if (statusText) statusText.innerText = 'Connexion en cours...';

    const ctx      = canvas.getContext('2d');
    const color    = userStore.get('user_color', '#00babc');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws       = new WebSocket(`${protocol}//${window.location.host}/ws/game/${roomId}/`);

    let mySide = null, state = null, animId = null, gameOver = false;
    const keys = {};

    const onDown = (e) => {
        if (gameOver || !mySide) return;
        if ((e.key === 'ArrowUp'    || e.key === 'w') && !keys[e.key]) { keys[e.key] = true; ws.send(JSON.stringify({ type:'input', key:'up' })); }
        if ((e.key === 'ArrowDown'  || e.key === 's') && !keys[e.key]) { keys[e.key] = true; ws.send(JSON.stringify({ type:'input', key:'down' })); }
        if ((e.key === 'ArrowLeft'  || e.key === 'a') && !keys[e.key]) { keys[e.key] = true; ws.send(JSON.stringify({ type:'input', key:'left' })); }   // ← AJOUTE
        if ((e.key === 'ArrowRight' || e.key === 'd') && !keys[e.key]) { keys[e.key] = true; ws.send(JSON.stringify({ type:'input', key:'right' })); }  // ← AJOUTE
    };
    const onUp = (e) => { delete keys[e.key]; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup',   onUp);

    const inputLoop = setInterval(() => {
        if (gameOver || !mySide || ws.readyState !== WebSocket.OPEN) return;
        if (keys['ArrowUp']    || keys['w']) ws.send(JSON.stringify({ type:'input', key:'up' }));
        if (keys['ArrowDown']  || keys['s']) ws.send(JSON.stringify({ type:'input', key:'down' }));
        if (keys['ArrowLeft']  || keys['a']) ws.send(JSON.stringify({ type:'input', key:'left' }));   // ← AJOUTE
        if (keys['ArrowRight'] || keys['d']) ws.send(JSON.stringify({ type:'input', key:'right' }));  // ← AJOUTE
    }, 16);

    ws.onopen = () => { if (statusText) statusText.innerText = 'Connecté ! En attente du 2ème joueur...'; };

    ws.onmessage = async (event) => { 
        const data = JSON.parse(event.data);
        switch (data.type) {
            case 'joined':
                mySide = data.side;
                if (statusText) statusText.innerText = `Tu joues côté ${mySide === 'left' ? 'gauche (W/S)' : 'droit (↑/↓)'}. En attente...`;
                break;
            case 'game_start':
                state = data.state;
                if (statusText) statusText.style.display = 'none';
                if (!animId) animId = requestAnimationFrame(renderLoop);
                break;
            case 'game_tick':
                state = data.state;
                break;
            case 'game_over':
                unlockNav();
                isOnline = 0;
                gameOver = true; state = data.state;
                clearInterval(inputLoop);
                window.removeEventListener('keydown', onDown);
                window.removeEventListener('keyup',   onUp);
                if (animId) cancelAnimationFrame(animId);
                drawFinal(data.winner);
                const myName    = userStore.get('user_name', '');
                const isVictory = data.winner === myName;
                const opponentName = mySide === 'left' ? state.right.name : state.left.name;
                const matchHistory = JSON.parse(localStorage.getItem('match_history') || '[]');
                matchHistory.unshift({
                    date:   new Date().toLocaleDateString(),
                    result: isVictory ? 'Victoire' : 'Défaite',
                    score:  `${state.left.score} - ${state.right.score}`,
                    opponent: opponentName,
                });
                localStorage.setItem('match_history', JSON.stringify(matchHistory.slice(0, 20)));
                await userStore.init();
                setTimeout(() => navigateTo('/profile'), 3000);
                break;
            case 'player_left':
                unlockNav();
                gameOver = true;
                clearInterval(inputLoop);
                if (animId) cancelAnimationFrame(animId);
                alert('Ton adversaire a quitté la partie.');
                navigateTo('/game');
                break;
            case 'error':
                alert(data.message); navigateTo('/game'); break;
        }
    };

    ws.onerror = () => { alert('Erreur de connexion au jeu.'); navigateTo('/game'); };
    ws.onclose = () => { if (!gameOver) { clearInterval(inputLoop); if (animId) cancelAnimationFrame(animId); } };
    window.addEventListener('popstate', () => { ws.close(); clearInterval(inputLoop); }, { once: true });

    function renderLoop() {
        if (!state || gameOver) return;
        draw(state); animId = requestAnimationFrame(renderLoop);
    }

    function draw(s) {
        const PW = 10, PH = 80;

        // Fond
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#050810');
        gradient.addColorStop(0.5, '#0a0f1a');
        gradient.addColorStop(1, '#050810');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Ligne centrale
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, 0);
        ctx.lineTo(canvas.width/2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Scores
        ctx.textAlign = 'center';
        ctx.font = 'bold 48px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillText(s.left.score,  canvas.width / 4,       70);
        ctx.fillText(s.right.score, (canvas.width / 4) * 3, 70);

        // Noms
        ctx.font = '13px monospace';
        const leftColor  = mySide === 'left'  ? color : '#ffffff';
        const rightColor = mySide === 'right' ? color : '#ffffff';
        ctx.fillStyle = leftColor;
        ctx.shadowColor = leftColor; ctx.shadowBlur = 8;
        ctx.fillText(s.left.name.toUpperCase(),  canvas.width/4,     20);
        ctx.fillStyle = rightColor;
        ctx.shadowColor = rightColor;
        ctx.fillText(s.right.name.toUpperCase(), (canvas.width/4)*3, 20);
        ctx.shadowBlur = 0;

        // Raquette gauche
        ctx.shadowColor = leftColor; ctx.shadowBlur = 15;
        ctx.fillStyle = leftColor;
        ctx.beginPath();
        ctx.roundRect(s.left.x,  s.left.y,  PW, PH, [4,4,4,4]); ctx.fill();
        ctx.fill();

        // Raquette droite
        ctx.shadowColor = rightColor; ctx.shadowBlur = 15;
        ctx.fillStyle = rightColor;
        ctx.beginPath();
        ctx.roundRect(s.right.x, s.right.y, PW, PH, [4,4,4,4]); ctx.fill();
        ctx.fill();

        // Balle
        ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.ball.x, s.ball.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
    }

    function drawFinal(winner) {
        draw(state);
        // Overlay flouté
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Titre
        ctx.textAlign = 'center';
        ctx.shadowColor = color; ctx.shadowBlur = 30;
        ctx.fillStyle = color;
        ctx.font = 'bold 42px monospace';
        ctx.fillText(`🏆 ${winner}`, canvas.width/2, canvas.height/2 - 10);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#8b949e';
        ctx.font = '16px monospace';
        ctx.fillText('VICTOIRE', canvas.width/2, canvas.height/2 + 30);
        ctx.font = '13px monospace';
        ctx.fillText('Redirection dans 3s...', canvas.width/2, canvas.height/2 + 60);
        ctx.textAlign = 'left';
    }
}

// ─── Exposer les fonctions globales ───────────────────────────────────────────
window.sendFriendRequest    = sendFriendRequest;
window.respondFriendRequest = respondFriendRequest;
window.removeFriend         = removeFriend;
window.inviteFriendToGame   = inviteFriendToGame;
window.initOnlinePong       = initOnlinePong;
