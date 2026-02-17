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
            
            // Formatage du temps de jeu réel
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;
            const timeStr = h > 0 ? `${h}h ${m}s` : `${m}m ${s}s`;

            const name = localStorage.getItem('user_name') || 'Milin';
            const color = localStorage.getItem('user_color') || '#00babc';

            return `
                <div class="hero-container">
                    <h1>Transcendence !</h1>
                    <p class="subtitle">Content de vous revoir, <span style="color:${color}">${name}</span></p>
                    
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
            // On affiche un titre différent selon le mode pour être sûr
            if (tournamentState.isActive && tournamentState.isMatchRunning) {
                const m = tournamentState.matches[tournamentState.currentMatchIndex];
                return `<h2>Tournoi : ${m.p1} VS ${m.p2}</h2>` + playPageHTML;
            }
            return `<h2>Match Amical</h2>` + playPageHTML;
        }, 
        init: () => {
            // On vérifie DEUX conditions : le tournoi est actif ET on a cliqué sur "Lancer le match"
            if (tournamentState.isActive && tournamentState.isMatchRunning) {
                const m = tournamentState.matches[tournamentState.currentMatchIndex];
                console.log("Démarrage match tournoi");
                initPongGame(m.p1, m.p2);
            } else {
                console.log("Démarrage match solo IA");
                initPongGame(); // Solo contre IA
            }
        }
    },
    // '/game': { 
    //     title: 'Jeu', 
    //     render: () => playPageHTML, 
    //     init: () => {
    //         if (tournamentState.isActive) {
    //             const m = tournamentState.matches[tournamentState.currentMatchIndex];
    //             initPongGame(m.p1, m.p2);
    //         } else {
    //             initPongGame(); // Solo contre IA
    //         }
    //     }
    // },
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
                        <h1>Nouveau Tournoi</h1>
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
            const name = localStorage.getItem('user_name') || 'Pilote';
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
    }
};

function initTournamentLogic() {
    // 1. Bouton de création (Écran de saisie des noms)
    const btnStart = document.getElementById('btn-start-t'); // CHANGÉ : btn-start-t
    if (btnStart) {
        btnStart.onclick = () => {
            const p1 = document.getElementById('tp1').value || "A";
            const p2 = document.getElementById('tp2').value || "B";
            const p3 = document.getElementById('tp3').value || "C";
            const p4 = document.getElementById('tp4').value || "D";

            tournamentState = {
                isActive: true,
                isMatchRunning: false, // Flag pour isoler le mode jeu
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

    // 2. Bouton Lancer le match (Écran de l'arbre)
    const btnPlay = document.getElementById('btn-play-match');
    if (btnPlay) {
        btnPlay.onclick = () => {
            // ON ACTIVE le mode tournoi juste avant de naviguer
            tournamentState.isMatchRunning = true; 
            navigateTo('/game');
        };
    }

    // 3. Bouton Annuler
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

// function initTournamentLogic() {
//     const btn = document.getElementById('btn-start-t');
//     if (!btn) return;

//     btn.onclick = () => {
//         // On récupère les valeurs des inputs tp1, tp2, tp3, tp4
//         const p1 = document.getElementById('tp1').value || "Pilote 1";
//         const p2 = document.getElementById('tp2').value || "Pilote 2";
//         const p3 = document.getElementById('tp3').value || "Pilote 3";
//         const p4 = document.getElementById('tp4').value || "Pilote 4";

//         tournamentState = {
//             isActive: true, // On active le tournoi ici
//             players: [p1, p2, p3, p4],
//             matches: [
//                 { p1: p1, p2: p2, winner: null }, // Demi-finale 1
//                 { p1: p3, p2: p4, winner: null }, // Demi-finale 2
//                 { p1: null, p2: null, winner: null } // Finale
//             ],
//             currentMatchIndex: 0
//         };

//         // On force le routeur à redessiner la page pour voir l'arbre
//         router(); 
//     };
// }

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
    // if (path === '/game' && !isLoggedIn) {
    //     console.warn("Accès refusé : redirection vers l'accueil.");
    //     navigateTo('/');
    //     return;
    // }
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
    try {
        const response = await fetch('/api/users/me/');
        
        // On vérifie le type de la réponse. Si ce n'est pas du JSON (ex: HTML), on ignore.
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
            currentUser = await response.json();
            return true;
        } else {
            // Le backend renvoie du HTML car l'API n'est pas encore faite, c'est normal.
            currentUser = null;
            return false;
        }
    } catch (err) {
        // On ne loggue l'erreur que si le serveur est carrément éteint (erreur réseau)
        // On enlève le console.error pour ne pas polluer ta console inutilement pour le moment
        // console.warn("Serveur injoignable ou API absente.");
    }
    currentUser = null;
    return false;
}

// async function checkAuth() {
//     try {
//         const response = await fetch('/api/users/me/');
//         if (response.ok) {
//             currentUser = await response.json();
//             return true;
//         }
//     } catch (err) {
//         console.error("Erreur Backend :", err);
//     }
//     currentUser = null;
//     return false;
// }

function renderAuthUI(isLoggedIn) {
    const container = document.getElementById('auth-status');
    if (!container) return;

    container.innerHTML = isLoggedIn 
        ? `<p>Pilote : <strong>${currentUser.username}</strong></p>
           <a href="/accounts/logout/" class="btn-logout">Déconnexion</a>`
        : `<a href="/accounts/fortytwo/login/" class="btn-42">Connexion avec 42</a>`;
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
    if (link && link.getAttribute('href').startsWith('/')) {
        const href = link.getAttribute('href');
        if (href.includes('/accounts/')) return;

        e.preventDefault();

        // NOUVEAU : Si on clique sur un lien de la navbar (ou n'importe quel <a>), 
        // on considère qu'on ne lance pas un match spécifique du tournoi.
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








// On ajoute des paramètres par défaut
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
    // On affiche qui va jouer
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
        let ballSpeedX = 1.5, ballSpeedY = 1.5;
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

            // Rebond haut et bas
            if (ballY <= 0 || ballY >= canvas.height) ballSpeedY = -ballSpeedY;

            // On définit une vitesse maximale pour éviter la téléportation
            const maxSpeed = 20;

            // COLLISION GAUCHE (Joueur 1)
            if (ballSpeedX < 0 && ballX <= paddleWidth) {
                if (ballY > leftPaddleY && ballY < leftPaddleY + paddleHeight) {
                    ballX = paddleWidth; // On repousse la balle sur le bord de la raquette
                    ballSpeedX = Math.min(Math.abs(ballSpeedX) * 1.1, maxSpeed);
                }
            }

            // COLLISION DROITE (Joueur 2 / IA)
            if (ballSpeedX > 0 && ballX >= canvas.width - paddleWidth) {
                if (ballY > rightPaddleY && ballY < rightPaddleY + paddleHeight) {
                    ballX = canvas.width - paddleWidth; // On repousse la balle sur le bord
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

            // 1. Calcul du temps
            let sessionSeconds = Math.floor((Date.now() - startTime) / 1000);
            let totalTime = parseInt(localStorage.getItem('pong_total_seconds') || '0');
            localStorage.setItem('pong_total_seconds', totalTime + sessionSeconds);

            cancelAnimationFrame(animationId);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);

            // On récupère ton nom actuel pour comparer
            const myName = localStorage.getItem('user_name') || 'Player';
            const isVictory = (winnerName === myName);

            // 2. Mise à jour des stats globales (seulement en mode Solo/IA)
            if (!tournamentState.isActive) {
                // XP
                let currentXP = parseInt(localStorage.getItem('user_xp') || '0');
                let xpGained = isVictory ? 100 : 20;
                localStorage.setItem('user_xp', currentXP + xpGained);

                // Victoires / Défaites
                let wins = parseInt(localStorage.getItem('pong_wins') || '0');
                let losses = parseInt(localStorage.getItem('pong_losses') || '0');

                if (isVictory) {
                    localStorage.setItem('pong_wins', wins + 1);
                } else {
                    localStorage.setItem('pong_losses', losses + 1);
                }

                // 3. Enregistrement dans l'historique
                let history = JSON.parse(localStorage.getItem('match_history') || '[]');
                history.unshift({
                    date: new Date().toLocaleString(),
                    result: isVictory ? "Victoire" : "Défaite",
                    score: `${score1} - ${score2}`,
                    opponent: name2 
                });
                localStorage.setItem('match_history', JSON.stringify(history.slice(0, 10)));
                
                // Fin de partie classique
                alert(`Match terminé ! Vainqueur : ${winnerName}`);
                navigateTo('/profile');
            } 
            else {
                // 4. GESTION DU TOURNOI
                // On enregistre le gagnant du match actuel
                tournamentState.matches[tournamentState.currentMatchIndex].winner = winnerName;

                if (tournamentState.currentMatchIndex === 0) {
                    // Fin Demi-finale 1
                    tournamentState.matches[2].p1 = winnerName; // Envoie en finale
                    tournamentState.currentMatchIndex = 1;      // Prépare le match suivant
                    alert(`Fin du match ! ${winnerName} passe en finale.`);
                    navigateTo('/tournament');
                } 
                else if (tournamentState.currentMatchIndex === 1) {
                    // Fin Demi-finale 2
                    tournamentState.matches[2].p2 = winnerName; // Envoie en finale
                    tournamentState.currentMatchIndex = 2;      // Prépare la finale
                    alert(`Fin du match ! ${winnerName} rejoint la finale.`);
                    navigateTo('/tournament');
                } 
                else if (tournamentState.currentMatchIndex === 2) {
                    // Fin de la Grande Finale
                    alert(`🏆 INCROYABLE ! ${winnerName} REMPORTE LE TOURNOI ! 🏆`);
                    tournamentState.isActive = false; // On clôture le tournoi
                    navigateTo('/profile'); // Retour au profil pour fêter ça
                }
            }
        }

        function resetBall() {
            ballX = canvas.width / 2;
            ballY = canvas.height / 2;
            // On remet la vitesse de base à 1 (ou -1 pour aller vers la gauche)
            ballSpeedX = (Math.random() > 0.5 ? 1 : -1);
            // On peut aussi randomiser la direction Haut/Bas pour plus de fun
            ballSpeedY = (Math.random() > 0.5 ? 1 : -1); 
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