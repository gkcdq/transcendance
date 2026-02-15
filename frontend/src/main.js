console.log("Script main.js chargé !");
let currentPongInstance = null; // variable global pour le jeu 

// ÉTAT GLOBAL
let currentUser = null;

// CONFIGURATION DES ROUTES
const routes = {
    '/': { 
        title: 'Accueil', 
        render: () => `
            <section class="hero">
                <h1>Transcendence</h1>
                <p>L'expérience ultime du Pong en SPA.</p>
                <div id="auth-status"></div>
            </section>` 
    },
    '/game': { 
        title: 'Jeu', 
        render: () => `<h1>Arena</h1><canvas id="pongCanvas" width="800" height="400"></canvas>`,
        init: initPongGame 
    },
    '/settings': { 
        title: 'Paramètres', 
        render: () => `<h1>Configuration</h1><div id="profile-settings"></div>`,
        init: fetchUserSettings 
    },
    '/404': {
        title: '404',
        render: () => `<h1>404</h1><p>Page introuvable.</p>`
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
                <h2>Configuration du Pilote</h2>
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
                            <option value="4.5">Facile</option>
                            <option value="6">Normal</option>
                            <option value="8">Expert</option>
                        </select>
                    </div>

                    <button type="submit" class="btn-save">Enregistrer les modifications</button>
                </form>
                <div id="settings-msg"></div>
            </div>`,
        init: initSettings
    },
    '/profile': { 
        title: 'Profil Utilisateur', 
        render: () => {
            const name = localStorage.getItem('user_name') || 'Pilote';
            const wins = parseInt(localStorage.getItem('pong_wins') || 0);
            const losses = parseInt(localStorage.getItem('pong_losses') || 0);
            const color = localStorage.getItem('user_color') || '#00babc';

            // Calcul de l'XP : 100 par victoire, 20 par défaite
            const totalXP = (wins * 100) + (losses * 20);
            const level = Math.floor(totalXP / 1000) + 1;
            const currentXP = totalXP % 1000;
            const xpPercentage = (currentXP / 1000) * 100;

            return `
                <div class="profile-container">
                    <div class="profile-header">
                        <div class="profile-avatar" style="border-color: ${color}">
                            <img src="https://ui-avatars.com/api/?name=${name}&background=0D1117&color=${color.replace('#','')}" alt="Avatar">
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
};

// CORE : LE ROUTEUR (Une seule définition propre)
const router = async () => {
    console.log("Routeur appelé pour :", window.location.pathname);
    const path = window.location.pathname;
    const route = routes[path] || routes['/404'];

    // 1. Vérification d'authentification
    const isLoggedIn = await checkAuth();

    // 2. Garde de sécurité
    // if (path === '/game' && !isLoggedIn) {
    //     console.warn("Accès refusé : redirection vers l'accueil.");
    //     navigateTo('/');
    //     return;
    // }

    // 3. Mise à jour du DOM
    document.title = `Transcendence - ${route.title}`;
    const appContainer = document.getElementById('app');
    if (appContainer) {
        appContainer.innerHTML = route.render();
    }

    // 4. Mise à jour de l'UI d'authentification
    renderAuthUI(isLoggedIn);

    // 5. Initialisation du composant si nécessaire
    if (route.init && typeof route.init === 'function') {
        route.init();
    }
};

// SERVICES : AUTHENTIFICATION & API
async function checkAuth() {
    try {
        // Attention : cette URL doit exister sur ton backend
        const response = await fetch('/api/users/me/');
        if (response.ok) {
            currentUser = await response.json();
            return true;
        }
    } catch (err) {
        console.error("Erreur Backend :", err);
    }
    currentUser = null;
    return false;
}

function renderAuthUI(isLoggedIn) {
    const container = document.getElementById('auth-status');
    if (!container) return;

    container.innerHTML = isLoggedIn 
        ? `<p>Pilote : <strong>${currentUser.username}</strong></p>
           <a href="/accounts/logout/" class="btn-logout">Déconnexion</a>`
        : `<a href="/accounts/fortytwo/login/" class="btn-42">Connexion avec 42</a>`;
}

// ACTIONS & ÉVÉNEMENTS
function navigateTo(url) {
    history.pushState(null, null, url);
    router();
    isGameOver = true;
    cancelAnimationFrame(currentPongInstance);
}

// Intercepter les clics sur les liens de navigation
document.addEventListener('click', e => {
    const link = e.target.closest('a'); 
    // On vérifie si c'est un lien interne (pas un lien vers l'API ou externe)
    if (link && link.getAttribute('href').startsWith('/')) {
        const href = link.getAttribute('href');
        // Si c'est un lien de déconnexion ou login 42, on laisse le navigateur gérer
        if (href.includes('/accounts/')) return;

        e.preventDefault();
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
// LE CODE DU JEU 
function initPongGame() {
    if (currentPongInstance){
        cancelAnimationFrame(currentPongInstance);
    }
    let animationId;
    let isGameOver = false; // Variable de contrôle de la boucle
    const canvas = document.getElementById('pongCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const userColor = localStorage.getItem('user_color') || '#00babc';
    const aiBaseSpeed = parseFloat(localStorage.getItem('ai_level')) || 5.3;

    const paddleWidth = 10, paddleHeight = 80;
    let leftPaddleY = (canvas.height - paddleHeight) / 2;
    let rightPaddleY = (canvas.height - paddleHeight) / 2;
    let ballX = canvas.width / 2, ballY = canvas.height / 2;
    let ballSpeedX = 5, ballSpeedY = 5;
    
    let scorePlayer = 0;
    let scoreIA = 0;

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

        let targetY = rightPaddleY + paddleHeight / 2;
        if (ballX > canvas.width / 2 && ballSpeedX > 0) {
            targetY = ballY + (Math.sin(Date.now() / 1000) * 20); 
        } else if (ballSpeedX < 0) {
            targetY = canvas.height / 2;
        }

        let centerPaddle = rightPaddleY + paddleHeight / 2;
        if (centerPaddle < targetY - 10) rightPaddleY += aiBaseSpeed;
        else if (centerPaddle > targetY + 10) rightPaddleY -= aiBaseSpeed;

        ballX += ballSpeedX;
        ballY += ballSpeedY;

        if (ballY <= 0 || ballY >= canvas.height) ballSpeedY = -ballSpeedY;

        const maxSpeed = 20;

        // Collision Gauche
        if (ballSpeedX < 0 && ballX <= paddleWidth) { 
            if (ballY > leftPaddleY && ballY < leftPaddleY + paddleHeight) {
                ballX = paddleWidth;
                ballSpeedX = Math.min(Math.abs(ballSpeedX) * 1.1, maxSpeed);
                ballSpeedY *= 1.05;
            }
        }

        // Collision Droite
        if (ballSpeedX > 0 && ballX >= canvas.width - paddleWidth) {
            if (ballY > rightPaddleY && ballY < rightPaddleY + paddleHeight) {
                ballX = canvas.width - paddleWidth;
                ballSpeedX = -Math.min(Math.abs(ballSpeedX) * 1.1, maxSpeed);
                ballSpeedY *= 1.05;
            }
        }

        // --- SCORE & FIN DE MATCH ---
        if (ballX < 0) {
            scoreIA++;
            if (scoreIA >= 5) endGame("IA");
            else resetBall();
        } else if (ballX > canvas.width) {
            scorePlayer++;
            if (scorePlayer >= 5) endGame("Player");
            else resetBall();
        }
    }

    function endGame(winner) {
        if (isGameOver) return;
        isGameOver = true; // Stoppe immédiatement la logique
        cancelAnimationFrame(animationId); // Tue le rendu

        // Nettoyage des écouteurs pour éviter les bugs sur les autres pages
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);

        // Stats
        let wins = parseInt(localStorage.getItem('pong_wins') || '0');
        let losses = parseInt(localStorage.getItem('pong_losses') || '0');

        if (winner === "Player") localStorage.setItem('pong_wins', wins + 1);
        else localStorage.setItem('pong_losses', losses + 1);

        // Historique
        let history = JSON.parse(localStorage.getItem('match_history') || '[]');
        history.unshift({
            date: new Date().toLocaleString(),
            result: winner === "Player" ? "Victoire" : "Défaite",
            score: `${scorePlayer} - ${scoreIA}`
        });
        localStorage.setItem('match_history', JSON.stringify(history.slice(0, 10)));

        alert(`Match terminé ! Vainqueur : ${winner}`);
        navigateTo('/profile'); 
    }

    function resetBall() {
        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        ballSpeedX = (Math.random() > 0.5 ? 5 : -5); // Direction aléatoire pour plus de fun
        ballSpeedY = 5;
    }

    function draw() {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "#ffffff33";
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();

        ctx.fillStyle = userColor; 
        ctx.fillRect(0, leftPaddleY, paddleWidth, paddleHeight);
        ctx.fillRect(canvas.width - paddleWidth, rightPaddleY, paddleWidth, paddleHeight);
        
        ctx.beginPath();
        ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "30px Arial";
        ctx.fillText(scorePlayer, canvas.width / 4, 50);
        ctx.fillText(scoreIA, (canvas.width / 4) * 3, 50);
    }

    gameLoop();
}

///////////////////

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

    // Charger les valeurs actuelles
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