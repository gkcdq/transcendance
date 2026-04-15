import { legalPageHTML, initLegal } from './legal.js';
import { getCsrfToken, userStore } from './userStore.js';
await userStore.init();
if (userStore.get('is_staff') === 'true') {
    const navLinks = document.querySelector('.nav-links');
    const li = document.createElement('li');
    li.innerHTML = `<a href="/admin-panel" data-link style="color:#ff4466;">⚙️ Admin</a>`;
    navLinks.appendChild(li);
}
import { initPongGame } from './Pong.js';
import { initOnlinePong } from './OnlinePong.js';
import { initSettings } from './settings.js';
import { initModeGame } from './ModeGame.js';
import { lockNav } from './State.js';
import { tournamentState ,initTournamentLogic, loadLeaderboard, initSpectatorMode, initBouncingBalls, initProfile, initChat} from '../main.js';
import { navigateTo } from './State.js';
import { FORTYTWO_CLIENT_UID } from '../config.js';
const UID      = FORTYTWO_CLIENT_UID;
const CALLBACK = encodeURIComponent('https://localhost:8443/accounts/fortytwo/login/callback/');
const authUrl  = `https://api.intra.42.fr/oauth/authorize?client_id=${UID}&redirect_uri=${CALLBACK}&response_type=code`;
const playModePageHTML = `
    <div class="game-container">
        <div id="game-controls">
            <button id="btn-start-game" class="cyber-button">Lancer la partie</button>
            <p id="game-status">Mode Octogone Prêt</p>
        </div>
        <canvas id="pongCanvas" width="1000" height="750" 
            style="display:none; 
                   clip-path: polygon(31.25% 0%, 68.75% 0%, 100% 25%, 100% 75%, 68.75% 100%, 31.25% 100%, 0% 75%, 0% 25%);
                   background: rgba(0,0,0,0.8);">
        </canvas>
    </div>
`;
const playPageHTML = `
    <div class="game-container">
        <div id="game-controls">
            <button id="btn-start-game" class="cyber-button">Lancer la partie</button>
            <p id="game-status">En attente du joueur...</p>
        </div>
        <canvas id="pongCanvas" width="1200" height="650" style="display:none;"></canvas>
    </div>
`;

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

export const routes = {

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
                        <h2>Pong Game 🎾</h2>
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
                                        <label style="color:#8b949e; font-size:0.72rem; text-transform:uppercase; display:block; margin-bottom:6px;">Identifiant</label>
                                        <input type="text" id="login-username" class="cyber-input" style="width:100%;" placeholder="Pseudo">
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
                                    <pr> </pr>
                                    <h6>👑 Grade : ${grade} 👑</h6>
                                    <h2>Pong Game 🎾</h2>
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
                                        <p class="subtitle">Une balle, deux raquettes, un seul vainqueur.</p>
                                        <div class="controls-grid">
                                            <div class="player-keys">
                                            <div>
                                                <p>Local Game : Raquette Gauche ⤵</p>
                                            </div>
                                                <div class="keys"><span class="key">W</span> <span class="key">A</span> <span class="key">S</span><span class="key">D</span> <span class="key">Shift</span></div>
                                            </div>
                                            <div class="divider"></div>
                                            <div class="player-keys">
                                                <p>Local Game : Raquette Droite ⤵</p>
                                                <div class="keys"><span class="key">↑</span> <span class="key">↓</span> <span class="key">→</span> <span class="key">←</span> <span class="key">0</span></div>
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
                                window.location.href = '/';
                            } else {
                                msg.innerHTML = `<span style="color:#ff4d6d;">${data.error}</span>`;
                            }
                        } catch (e) { msg.innerHTML = '<span style="color:#ff4d6d;">Errtteur réseau.</span>'; }
                    };
                    document.getElementById('btn-login').onclick = doLogin;
                    document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
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
                //
                //
            },
    '/game': {
        title: 'Jeu',
        render: () => {
            const myName = userStore.get('user_name', 'Player');
            return `
                <canvas id="pong-canvas-bg"></canvas>
                <h4 style="text-transform:uppercase;letter-spacing:2px;">⚔️ Pong Match ⚔️</h4>
                <div id="game-layout" style="display:flex;gap:30px;align-items:flex-start;justify-content:center;padding:20px;flex-wrap:wrap;">        
                    <!-- COLONNE GAUCHE -->
                    <div id="setup-container" style="display:flex;flex-direction:column;align-items:center;gap:20px;min-width:320px;">
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

                            <div class="category-block">
                                <h3 style="color:#8b949e;font-size:0.9rem;text-transform:uppercase;margin-bottom:10px;border-left:3px solid #8b949e;padding-left:10px;letter-spacing:1px;">👁️ Spectateur</h3>
                                <div class="setup-group" style="border:1px solid #8b949e;padding:15px;border-radius:8px;background:rgba(139,148,158,0.05);">
                                    <div id="active-rooms-list"><p style="color:#8b949e;font-size:0.75rem;">Aucune partie en cours.</p></div>
                                </div>
                            </div>
                            
                            <div class="category-block">
                                <h3 style="color:#a855f7;font-size:0.9rem;text-transform:uppercase;margin-bottom:10px;border-left:3px solid #a855f7;padding-left:10px;letter-spacing:1px;">🔥 Octogone Mode 🔥</h3>
                                <div class="setup-group" style="border:1px solid #a855f7;padding:15px;border-radius:8px;background:rgba(168,85,247,0.05);">
                                    <p style="color:#a855f7;font-size:0.7rem;margin-bottom:10px;">Map octogonale + bonus/mallus.</p>
                                    <button id="btn-ModeIA" class="cyber-button" style="width:100%;margin-bottom:8px;border-color:#a855f7;color:#a855f7;">🤖 vs IA</button>
                                    <label style="color:#a855f7;font-size:0.7rem;display:block;margin-bottom:5px;text-transform:uppercase;opacity:0.8;">Joueur 2</label>
                                    <input type="text" id="p2-mode-name" placeholder="Pseudo joueur 2" class="cyber-input" style="width:100%;margin-bottom:8px;">
                                    <button id="btn-Mode1v1" class="cyber-button" style="width:100%;border-color:#a855f7;color:#a855f7;">👥 1 VS 1</button>
                                </div>
                            </div>

                        </div>
                    </div>

                    <!-- COLONNE DROITE : règles -->
                    <div style="min-width:280px;max-width:320px;display:flex;flex-direction:column;gap:97px;margin-top:20px;">
                        
                        <div style="border:1px solid #00babc;border-radius:8px;padding:15px;background:rgba(0,186,188,0.05);">
                            <h3 style="color:#00babc;font-size:0.85rem;text-transform:uppercase;margin-bottom:8px;">🤖 IA</h3>
                            <p style="color:#8b949e;font-size:0.75rem;line-height:1.5;">Entraine toi avec une intelligence artificielle. La difficulté est réglable dans les paramètres. Premier à 5 points gagne.</p>
                        </div>

                        <div style="border:1px solid #ffb921;border-radius:8px;padding:15px;background:rgba(247,255,0,0.05);">
                            <h3 style="color:#ffb921;font-size:0.85rem;text-transform:uppercase;margin-bottom:8px;">👥 Local 1v1</h3>
                            <p style="color:#8b949e;font-size:0.75rem;line-height:1.5;">Deux joueurs sur le même clavier. J1 : <kbd>WASD</kbd>. J2 : <kbd>🠔↑↓🠖</kbd>. Premier à 5 points gagne.</p>
                        </div>

                        <div style="border:1px solid #ff0055;border-radius:8px;padding:15px;background:rgba(255,0,85,0.05);">
                            <h3 style="color:#ff0055;font-size:0.85rem;text-transform:uppercase;margin-bottom:8px;">🌐 Online</h3>
                            <p style="color:#8b949e;font-size:0.75rem;line-height:1.5;">Joue en ligne ou rejoins une room avec un code. La partie se joue en temps réel via WebSocket. Premier à 5 points gagne.</p>
                        </div>

                        <div style="border:1px solid #8b949e;border-radius:8px;padding:15px;background:rgba(139,148,158,0.05);">
                            <h3 style="color:#8b949e;font-size:0.85rem;text-transform:uppercase;margin-bottom:8px;">👁️ Spectateur</h3>
                            <p style="color:#8b949e;font-size:0.75rem;line-height:1.5;">Regarde une partie en cours en temps réel d'autre joueur, sans intervenir.</p>
                        </div>

                        <div style="border:1px solid #a855f7;border-radius:8px;padding:15px;background:rgba(168,85,247,0.05);">
                            <h3 style="color:#a855f7;font-size:0.85rem;text-transform:uppercase;margin-bottom:8px;">🔥 Octogone Mode</h3>
                            <p style="color:#8b949e;font-size:0.75rem;line-height:1.5;"><strong>Arène :</strong> Octogone avec rebonds sur murs diagonaux. <strong>Capacités :</strong> Bonus/Mallus activables via 'Shift' (J1) / '0' (J2). <strong> Solo : </strong>Mode entraînement contre l'IA inclus. Premier à 5 points gagne. </p>
                            <ul style="color:#8b949e;font-size:0.75rem;line-height:1.8;padding-left:15px;margin-top:5px;">
                                <li>🧱 <strong style="color:#a855f7;">Wall</strong> ➜ mur du mexique 3s</li>
                                <li>❄️ <strong style="color:#a855f7;">Freeze</strong> ➜ gèle la balle 2s</li>
                                <li>⚡ <strong style="color:#a855f7;">Boost</strong> ➜ accélère la raquette 5s</li>
                                <li>💥 <strong style="color:#a855f7;">Canon</strong> ➜ un tir droit puissant</li>
                                <li>👺 <strong style="color:#a855f7;">MALUS</strong> ▼</li>
                                <li>Apparition de balles chez l'adversaire 5s</li>
                                <li>Inversion des directions adverse 5s</li>
                                <li>Fige l'adversaire sur place 2s</li>
                                <li>Réduit la taille de la raquette adverse 3s</li>
                                <li>Rend la raquette de l'adversaire invisible 5s</li>
                            </ul>
                        </div>

                    </div>
                </div>
                <div id="pong-game-wrapper" style="display:none;">
                    ${playPageHTML}
            </div>`;
        },
        init: () => {
            initBouncingBalls();
            const gameLayout = document.getElementById('game-layout');
            const gameWrapper = document.getElementById('pong-game-wrapper');
            const activeRoom = sessionStorage.getItem('active_room');
            if (activeRoom) { sessionStorage.removeItem('active_room'); }
            const btnIA = document.getElementById('btn-play-ia');
            const btnFriend = document.getElementById('btn-play-friend');
            const btnMatchmaking = document.getElementById('btn-matchmaking');
            const btnJoin = document.getElementById('btn-join-room');
            const btnModeIA = document.getElementById('btn-ModeIA');
            const btnMode1v1 = document.getElementById('btn-Mode1v1');

            if (btnMode1v1) btnMode1v1.onclick = () => {
                gameWrapper.innerHTML = playModePageHTML;
                const name2 = document.getElementById('p2-mode-name').value || "Joueur 2";
                gameLayout.style.display = 'none'; 
                gameWrapper.style.display = 'block';
                initModeGame(userStore.get('user_name', 'Joueur 1'), name2);
            };

            if (btnIA) btnIA.onclick = () => {
                gameWrapper.innerHTML = playPageHTML;
                gameLayout.style.display = 'none';
                gameWrapper.style.display = 'block';
                initPongGame(userStore.get('user_name', 'Joueur'), "IA");
            };

            if (btnModeIA) btnModeIA.onclick = () => {
                gameWrapper.innerHTML = playModePageHTML;
                gameLayout.style.display = 'none';
                gameWrapper.style.display = 'block';
                initModeGame(userStore.get('user_name', 'Joueur'), "IA");
            };

            if (btnFriend) btnFriend.onclick = () => {
                gameWrapper.innerHTML = playPageHTML;
                const name2 = document.getElementById('p2-name').value || "Invité";
                gameLayout.style.display = 'none'; 
                gameWrapper.style.display = 'block';
                initPongGame(userStore.get('user_name', 'Joueur 1'), name2);
            };

            if (btnMatchmaking) btnMatchmaking.onclick = async () => {
                gameWrapper.innerHTML = playPageHTML;
                const mmStatus = document.getElementById('mm-status');
                mmStatus.style.display = 'block';
                mmStatus.innerHTML = `<span style="color:#ff0055;">🔍 Recherche d'adversaire...</span>`;
                btnMatchmaking.disabled = true;
                sessionStorage.setItem('matchmaking_active', '1');

                let isSearching = true;
                const interval = setInterval(async () => {
                    if (!isSearching || document.getElementById('mm-status') != mmStatus) {
                        clearInterval(interval);
                        mmStatus.style.display = 'none';
                        btnMatchmaking.disabled = false;
                        sessionStorage.removeItem('matchmaking_active');
                        return;
                    }
                    try {
                        const res = await fetch('/api/game/matchmaking/', {
                            method: 'POST', credentials: 'include',
                            headers: { 'X-CSRFToken': getCsrfToken() }
                        });
                        if (res.status === 401 || res.redirected) {
                            clearInterval(interval);
                            mmStatus.style.display = 'none';
                            isSearching = false;
                            sessionStorage.removeItem('matchmaking_active');
                            window.location.href = '/';
                            return;
                        }
                        const data = await res.json();
                        if (data.status === 'matched') {
                            clearInterval(interval);
                            sessionStorage.removeItem('matchmaking_active');
                            lockNav();
                            const app = document.getElementById('app');
                            app.innerHTML = `
                                <canvas id="pong-canvas-bg"></canvas>
                                <div class="game-container" style="position:relative;z-index:1;">
                                    <canvas id="pongCanvas" width="1200" height="650"></canvas>
                                </div>`;
                            initBouncingBalls();
                            initOnlinePong(data.room_id);
                        } else {
                            const dots = '.'.repeat((Date.now() / 500 % 3 | 0) + 1);
                            mmStatus.innerHTML = `<span style="color:#ff0055;">🔍 Recherche${dots}</span>`;
                        }
                    } catch (e) {
                        isSearching = false;
                        clearInterval(interval);
                        btnMatchmaking.disabled = false;    
                        sessionStorage.removeItem('matchmaking_active');
                        mmStatus.innerHTML = `<span style="color:#ff4d6d;">Erreur réseau.</span>`;
                    }
                }, 2000);

                mmStatus.innerHTML += `<br><button id="btn-cancel-mm" style="background:none;border:none;color:#8b949e;cursor:pointer;margin-top:8px;font-size:0.8rem;">Annuler</button>`;
                setTimeout(() => {
                    const btnCancel = document.getElementById('btn-cancel-mm');
                    if (btnCancel) btnCancel.onclick = () => {
                        isSearching = false;
                        clearInterval(interval);
                        btnMatchmaking.disabled = false;
                        sessionStorage.removeItem('matchmaking_active');
                        cancelMatchmaking();
                        mmStatus.style.display = 'none';
                    };
                }, 100);
            };

            if (btnJoin) btnJoin.onclick = () => {
                const code = document.getElementById('room-id-input').value.trim();
                if (!code) return;
                gameLayout.style.display = 'none'; 
                gameWrapper.style.display = 'block';
                initOnlinePong(code);
            };

            function refreshRooms() {
                fetch('/api/game/rooms/', { credentials: 'include' })
                    .then(r => r.json())
                    .then(data => {
                        const list = document.getElementById('active-rooms-list');
                        if (!list) { clearInterval(roomsInterval); return; }
                        if (!data.rooms || data.rooms.length === 0) {
                            list.innerHTML = '<p style="color:#8b949e;font-size:0.75rem;">Aucune partie en cours.</p>';
                            return;
                        }
                        list.innerHTML = data.rooms.map(r => `
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <span style="color:#ccc;font-size:0.75rem;">⚔️ ${r.players.join(' vs ')}</span>
                                <a href="/spectate?room=${r.room_id}" data-link
                                style="color:#8b949e;font-size:0.7rem;border:1px solid #8b949e;padding:3px 8px;border-radius:4px;text-decoration:none;">
                                👁️ Regarder
                                </a>
                            </div>`).join('');
                    })
                    .catch(() => {});
            }
            refreshRooms();
            const roomsInterval = setInterval(refreshRooms, 3000);
            window.addEventListener('popstate', () => clearInterval(roomsInterval), { once: true });
        }
    },
    '/404': { title: '404', render: () => `<h1>404</h1><p>Invalid.</p>` }, '/accounts/fortytwo/login/callback/': {
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
                            <label>Avatar</label>
                            <input type="file" id="avatar-input" accept="image/*" class="cyber-input" style="margin-bottom:8px;">
                            <div id="avatar-preview" style="margin-bottom:8px;"></div>
                            <button type="button" id="btn-upload-avatar" class="cyber-button" style="width:100%;">📷 Changer l'avatar</button>
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
                        <button type="button" id="btn-reset-settings" class="cyber-button" style="width:100%;margin-top:8px;border-color:#8b949e;color:#8b949e;">↺ Réinitialiser par défaut</button>
                    </form>
                    <p></p>
                    <p></p>
                    <p></p>
                    <div class="setting-group">
                        <label>Changer l'email</label>
                        <input type="email" id="email-input" placeholder="Nouvel email" class="cyber-input" style="width:100%;margin-bottom:8px;">
                        <button type="button" id="btn-update-email" class="cyber-button" style="width:100%;">✉️ Mettre à jour l'email</button>
                    </div>
                    <div class="setting-group">
                        <label>Changer le mot de passe</label>
                        <input type="password" id="old-password" placeholder="Ancien mot de passe" class="cyber-input" style="width:100%;margin-bottom:8px;">
                        <input type="password" id="new-password" placeholder="Nouveau mot de passe" class="cyber-input" style="width:100%;margin-bottom:8px;">
                        <input type="password" id="confirm-password" placeholder="Confirmer le mot de passe" class="cyber-input" style="width:100%;margin-bottom:8px;">
                        <button type="button" id="btn-update-password" class="cyber-button" style="width:100%;">🔒 Mettre à jour le mot de passe</button>
                    </div>
                    <div id="settings-msg"></div>
                    <div style="margin-top:40px;border-top:1px solid rgba(255,0,85,0.2);padding-top:20px;">
                        <h3 style="color:#ff0055;font-size:0.9rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:15px;">⚖️ Données personnelles (RGPD)</h3>
                        <button id="btn-delete-account" class="cyber-button" style="width:100%;border-color:#ff0055;color:#ff0055;">
                            🗑️ Supprimer mon compte
                        </button>
                    </div>
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
                initProfile();
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
            } catch (e) { msg.innerHTML = '<span style="color:#ff4d6d;">Errteur réseau.</span>'; }
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
    '/spectate': {
        title: 'Spectateur',
        render: () => `
            <canvas id="pong-canvas-bg"></canvas>
            <div class="game-container" style="position:relative;z-index:1;">
                <p id="spec-status" style="color:#00babc;text-align:center;margin-bottom:10px;">👁️ Mode spectateur</p>
                <canvas id="pongCanvas" width="1200" height="650"></canvas>
            </div>`,
        init: () => {
            initBouncingBalls();
            const roomId = new URLSearchParams(window.location.search).get('room');
            if (!roomId) { navigateTo('/game'); return; }
            initSpectatorMode(roomId);
        }
    },
    '/admin-panel': {
        title: 'Administration',
        render: () => {
            const isAdmin = userStore.get('is_staff') === 'true';
            if (!isAdmin) {
                navigateTo('/');
                return '';
            }
            return `
                <div class="hero-container" style="position:relative; z-index:1; text-align:center; padding-top:80px;">
                    <h2>⚙️ Espace Administration</h2>
                    <p style="color:#8b949e; margin:20px 0;">Bienvenue, administrateur.</p>
                    <a href="/admin/" class="cyber-button" style="display:inline-block; margin-top:20px; color:#ff4466; border-color:#ff4466;">
                        🔧 Accéder au panneau Django Admin
                    </a>
                </div>`;
        },
        init: () => {}
    },
    '/legal': {
    title: 'Mentions légales',
    render: () => legalPageHTML,
    init: () => {
        initBouncingBalls();
        initLegal();
    }
},
};