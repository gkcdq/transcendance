console.log("Script main.js chargé !");

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
    }
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

// LE CODE DU JEU 
function initPongGame() {
    const canvas = document.getElementById('pongCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 1. Paramètres du jeu & Scores
    const paddleWidth = 10, paddleHeight = 80;
    let leftPaddleY = (canvas.height - paddleHeight) / 2;
    let rightPaddleY = (canvas.height - paddleHeight) / 2;
    let ballX = canvas.width / 2, ballY = canvas.height / 2;
    let ballSpeedX = 5, ballSpeedY = 5;
    
    let scorePlayer = 0;
    let scoreIA = 0;

    const keys = {};
    window.addEventListener('keydown', e => keys[e.key] = true);
    window.addEventListener('keyup', e => keys[e.key] = false);

    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    function update() {
        // Mouvement Joueur (W / S)
        if (keys['w'] && leftPaddleY > 0) leftPaddleY -= 7;
        if (keys['s'] && leftPaddleY < canvas.height - paddleHeight) leftPaddleY += 7;

        // --- IA LOGIQUE (Raquette Droite)
        let centerPaddle = rightPaddleY + paddleHeight / 2;
        let aiSpeed = 7; // Plus lent que ta raquette (7) pour te donner l'avantage

        // L'IA ne réagit que si la balle vient vers elle (ballSpeedX > 0)
        // et elle a une zone d'incertitude (marge de 20px)
        if (ballSpeedX > 0) {
            if (centerPaddle < ballY - 20) {
                rightPaddleY += aiSpeed;
            } else if (centerPaddle > ballY + 20) {
                rightPaddleY -= aiSpeed;
            }
        }
        //

        ballX += ballSpeedX;
        ballY += ballSpeedY;

        // Rebond haut/bas
        if (ballY <= 0 || ballY >= canvas.height)
        {
            ballSpeedY = -ballSpeedY

        };

        // Collisions Raquettes
        if (ballX <= paddleWidth && ballY > leftPaddleY && ballY < leftPaddleY + paddleHeight) {
            // On s'assure que la balle repart dans le bon sens (positif)
            ballSpeedX = Math.abs(ballSpeedX) * 1.1; 
            // On ajoute un petit effet sur la vitesse verticale pour plus de fun
            ballSpeedY *= 1.05; 
        }

        if (ballX >= canvas.width - paddleWidth && ballY > rightPaddleY && ballY < rightPaddleY + paddleHeight) {
            // On s'assure que la balle repart dans le bon sens (négatif)
            ballSpeedX = -Math.abs(ballSpeedX) * 1.1;
            ballSpeedY *= 1.05;
        }

        // --- SCORE & RESET ---
        if (ballX < 0) {
            scoreIA++;
            resetBall();
        } else if (ballX > canvas.width) {
            scorePlayer++;
            resetBall();
        }
    }

    function resetBall() {
        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        ballSpeedX = 5;
        ballSpeedY = 5
    }

    function draw() {
        // Fond
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Filet central
        ctx.strokeStyle = "#ffffff33";
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();

        // Raquettes et Balle
        ctx.fillStyle = "#00babc"; // Couleur 42
        ctx.fillRect(0, leftPaddleY, paddleWidth, paddleHeight);
        ctx.fillRect(canvas.width - paddleWidth, rightPaddleY, paddleWidth, paddleHeight);
        
        ctx.beginPath();
        ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
        ctx.fill();

        // Affichage Score
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