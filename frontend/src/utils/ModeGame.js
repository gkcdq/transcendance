import { userStore } from './userStore.js';
import { letCurrentPongInstance } from './State.js';
import { tournamentState } from '../main.js';
import { navigateTo } from '../main.js';

export function initModeGame(p1Name = "Player", p2Name = "IA")
{
    const name = userStore.get('user_name');
    if (name && p1Name === "Player") p1Name = name;
    const btnStart   = document.getElementById('btn-start-game');
    const canvas     = document.getElementById('pongCanvas');
    const statusText = document.getElementById('game-status');
    if (!canvas || !btnStart) return;
    const ctx = canvas.getContext('2d');
    statusText.innerText   = `${p1Name} VS ${p2Name}`;
    btnStart.style.display = 'inline-block';
    canvas.style.display   = 'none';

    // zone des bonus sous la map
    let bonusBar = document.getElementById('bonus-bar');
    if (!bonusBar) {
        bonusBar = document.createElement('div');
        bonusBar.id = 'bonus-bar';
        bonusBar.style.cssText = 'display:flex;justify-content:space-between;width:1200px;max-width:100%;margin:8px auto 0;font-family:monospace;font-size:0.85rem;';
        bonusBar.innerHTML = `
            <div id="bonus-p1" style="color:#00babc;">Shift: —</div>
            <div id="bonus-p2" style="color:#fff;text-align:right;">0: —</div>`;
        canvas.parentNode.insertBefore(bonusBar, canvas.nextSibling);
    }

    btnStart.onclick = () => {
        btnStart.style.display   = 'none';
        statusText.style.display = 'none';
        canvas.style.display     = 'block';
        startGameModeLogic(p1Name, p2Name, canvas, ctx);
    };
}

function startGameModeLogic(name1, name2, canvas, ctx)
{
    let startTime     = Date.now();
    let lastBonusTime = 0;
    let isGameOver    = false;
    let animationId;
    const userColor   = userStore.get('user_color', '#00babc');
    const aiBaseSpeed = parseFloat(userStore.get('ai_level', '5.3')) || 5.3;
    const paddleWidth = 10;
    let p1paddleHeight = 80;
    let p2paddleHeight = 80;
    const PADDLE_MAX_X = canvas.width / 2 - paddleWidth;
    let leftPaddleX  = canvas.width  / 2 - (Math.min(canvas.width/2, canvas.height/2) - 10);
    let leftPaddleY  = (canvas.height - p1paddleHeight) / 2;
    let rightPaddleX = canvas.width - paddleWidth;
    let rightPaddleY = (canvas.height - p2paddleHeight) / 2;

    let ballX = canvas.width / 2, ballY = canvas.height / 2;
    let ballSpeedX = 5, ballSpeedY = 5;
    let score1 = 0, score2 = 0;

    let p1Bonuses = [], p2Bonuses = [];
    let p1SpeedMult = 1, p2SpeedMult = 1;

    const BONUS_DEFS = [
        { id: 'wall',   label: '🛡️ Mur'   },
        { id: 'boost',  label: '⚡ Boost'  },
        { id: 'freeze', label: '❄️ Freeze' },
    ];

    function applyBonus(bonus, side) {
        if (bonus.id === 'wall') {
            if (side === 'left') {
                if (p1paddleHeight === canvas.height) return;
                const orig = p1paddleHeight;
                p1paddleHeight = canvas.height;
                setTimeout(() => { p1paddleHeight = orig; }, 3000);
            } else {
                if (p2paddleHeight === canvas.height) return;
                const orig = p2paddleHeight;
                p2paddleHeight = canvas.height;
                setTimeout(() => { p2paddleHeight = orig; }, 3000);
            }
        } else if (bonus.id === 'boost') {
            if (side === 'left') { p1SpeedMult = 2; setTimeout(() => { p1SpeedMult = 1; }, 5000); }
            else                  { p2SpeedMult = 2; setTimeout(() => { p2SpeedMult = 1; }, 5000); }
        } else if (bonus.id === 'freeze') {
            // Ne rien faire si déjà gelée
            if (ballSpeedX === 0 && ballSpeedY === 0) return;
            const ox = ballSpeedX, oy = ballSpeedY;
            ballSpeedX = 0; ballSpeedY = 0;
            setTimeout(() => { ballSpeedX = ox; ballSpeedY = oy; }, 2000);
        }
    }

    function updateBonus() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed % 10 === 0 && elapsed !== lastBonusTime && elapsed !== 0) {
            lastBonusTime = elapsed;
            const b1 = BONUS_DEFS[Math.floor(Math.random() * BONUS_DEFS.length)];
            const b2 = BONUS_DEFS[Math.floor(Math.random() * BONUS_DEFS.length)];
            if (p1Bonuses.length < 3) p1Bonuses.push(b1);
            if (p2Bonuses.length < 3) p2Bonuses.push(b2);
            if (name2 === 'IA' && p2Bonuses.length > 0) {
                setTimeout(() => { if (p2Bonuses.length > 0) applyBonus(p2Bonuses.shift(), 'right'); }, 2000);
            }
        }
    }

    function renderBonusBar() {
        const el1 = document.getElementById('bonus-p1');
        const el2 = document.getElementById('bonus-p2');
        if (el1) el1.innerHTML = `<b style="color:#00babc">[Shift]</b> ${p1Bonuses.map(b => b.label).join(' | ') || '—'}`;
        if (el2) el2.innerHTML = `${p2Bonuses.map(b => b.label).join(' | ') || '—'} <b style="color:#fff">[0]</b>`;
    }

    const keys = {};
    let shiftUsed = false, zeroUsed = false;
    const handleKeyDown = e => {
        if (['w','s','a','d','W', 'S', 'A', 'D','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
            if (document.activeElement.tagName !== 'INPUT') e.preventDefault();
        }
        keys[e.key] = true;
        if (e.key === 'Shift' && !shiftUsed && p1Bonuses.length > 0) {
            shiftUsed = true;
            applyBonus(p1Bonuses.shift(), 'left');
        }
        if (e.key === '0' && !zeroUsed && p2Bonuses.length > 0 && name2 !== 'IA') {
            zeroUsed = true;
            applyBonus(p2Bonuses.shift(), 'right');
        }
    };
    const handleKeyUp = e => {
        keys[e.key] = false;
        if (e.key === 'Shift') shiftUsed = false;
        if (e.key === '0')     zeroUsed  = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup',   handleKeyUp);

    function gameLoop() {
        if (isGameOver) return;
        update(); draw(); renderBonusBar();
        animationId = requestAnimationFrame(gameLoop);
        letCurrentPongInstance(animationId);
    }

    function octagonBounce() {
        const offset = canvas.width * 0.3;
        const w = canvas.width, h = canvas.height;
        if (ballY < 0) { ballY = 0; ballSpeedY *= -1; }
        if (ballY > h) { ballY = h; ballSpeedY *= -1; }
        if (ballX < 0) { ballX = 0; ballSpeedX *= -1; }
        if (ballX > w) { ballX = w; ballSpeedX *= -1; }
        if (ballX + ballY < offset) {
            let t = ballSpeedX; ballSpeedX = Math.abs(ballSpeedY); ballSpeedY = Math.abs(t);
            ballX = offset - ballY + 1;
        }
        if ((w - ballX) + ballY < offset) {
            let t = ballSpeedX; ballSpeedX = -Math.abs(ballSpeedY); ballSpeedY = Math.abs(t);
            ballX = w - (offset - ballY) - 1;
        }
        if (ballX + (h - ballY) < offset) {
            let t = ballSpeedX; ballSpeedX = Math.abs(ballSpeedY); ballSpeedY = -Math.abs(t);
            ballX = offset - (h - ballY) + 1;
        }
        if ((w - ballX) + (h - ballY) < offset) {
            let t = ballSpeedX; ballSpeedX = -Math.abs(ballSpeedY); ballSpeedY = -Math.abs(t);
            ballX = w - (offset - (h - ballY)) - 1;
        }
    }

    function constrainPaddle(px, py, pH) {
        const offset = canvas.width * 0.3;
        const w = canvas.width, h = canvas.height;
        let minY = 0, maxY = h - pH;
        if (px < offset) { minY = offset - px; maxY = h - pH - (offset - px); }
        else if (px + paddleWidth > w - offset) {
            const excess = px + paddleWidth - (w - offset);
            minY = excess; maxY = h - pH - excess;
        }
        return Math.max(minY, Math.min(maxY, py));
    }

    function update() {
        updateBonus();

        // ── Joueur gauche ──
        const speed = 7 * p1SpeedMult, hSpeed = 4 * p1SpeedMult;
        if (keys['w'] || keys['W']) leftPaddleY -= speed;
        if (keys['s'] || keys['S']) leftPaddleY += speed;
        if ((keys['d'] || keys['D']) && leftPaddleX < PADDLE_MAX_X) leftPaddleX += hSpeed;
        if ((keys['a'] || keys['A']) && leftPaddleX > paddleWidth / 2) leftPaddleX -= hSpeed;
        // Contraint après mouvement
        leftPaddleY = constrainPaddle(leftPaddleX, leftPaddleY, p1paddleHeight);

        // IA
        if (name2 === "IA") {
            const sp = aiBaseSpeed * p2SpeedMult;
            const hs = 4 * p2SpeedMult * 0.6;
            const centerPaddle = rightPaddleY + p2paddleHeight / 2;
            const targetY = ballSpeedX > 0 ? ballY : canvas.height / 2;
            if (centerPaddle < targetY - 10) rightPaddleY += sp;
            else if (centerPaddle > targetY + 10) rightPaddleY -= sp;
            const targetX = ballSpeedX > 0
                ? Math.max(canvas.width / 2, ballX - 60)
                : canvas.width - paddleWidth - 10;
            if (rightPaddleX > targetX + 3) rightPaddleX -= hs;
            else if (rightPaddleX < targetX - 3) rightPaddleX += hs;
            rightPaddleX = Math.max(canvas.width / 2, Math.min(canvas.width - paddleWidth - 10, rightPaddleX));
        } else {
            const sp2 = 7 * p2SpeedMult, hs2 = 4 * p2SpeedMult;
            if (keys['ArrowUp'])    rightPaddleY -= sp2;
            if (keys['ArrowDown'])  rightPaddleY += sp2;
            if (keys['ArrowLeft']  && rightPaddleX > canvas.width / 2)           rightPaddleX -= hs2;
            if (keys['ArrowRight'] && rightPaddleX < canvas.width - paddleWidth) rightPaddleX += hs2;
        }
        // Contraint après mouvement
        rightPaddleY = constrainPaddle(rightPaddleX, rightPaddleY, p2paddleHeight);

        ballX += ballSpeedX; ballY += ballSpeedY;
        octagonBounce();

        const maxSpeed = 20;
        // Collision raquette droite
        if (ballSpeedX > 0) {
            const prevBallX = ballX - ballSpeedX;
            if (prevBallX < rightPaddleX + paddleWidth && ballX >= rightPaddleX) {
                if (ballY + 6 > rightPaddleY && ballY - 6 < rightPaddleY + p2paddleHeight) {
                    ballX = rightPaddleX - 1;
                    ballSpeedX = -Math.min(Math.abs(ballSpeedX) * 1.1, maxSpeed);
                }
            }
        }
        // Collision raquette gauche
        if (ballSpeedX < 0) {
            const prevBallX = ballX - ballSpeedX;
            if (prevBallX > leftPaddleX && ballX <= leftPaddleX + paddleWidth) {
                if (ballY + 6 > leftPaddleY && ballY - 6 < leftPaddleY + p1paddleHeight) {
                    ballX = leftPaddleX + paddleWidth + 1;
                    ballSpeedX = Math.min(Math.abs(ballSpeedX) * 1.1, maxSpeed);
                }
            }
        }

        if (ballX <= 0)                { score2++; if (score2 >= 5) endGame(name2); else resetBall(); }
        else if (ballX >= canvas.width) { score1++; if (score1 >= 5) endGame(name1); else resetBall(); }
    }

    async function endGame(winnerName) {
        if (isGameOver) return;
        isGameOver = true;
        const sessionSeconds = Math.floor((Date.now() - startTime) / 1000);
        cancelAnimationFrame(animationId);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup',   handleKeyUp);
        document.getElementById('bonus-bar')?.remove();
        const isTournamentMatch = tournamentState.isActive && window.location.pathname === '/tournament-game';
        const myName    = userStore.get('user_name', 'Player');
        const isVictory = (winnerName === myName);
        if (!isTournamentMatch) {
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
        leftPaddleX  = canvas.width / 2 - (Math.min(canvas.width/2, canvas.height/2) - 10);
        leftPaddleY  = (canvas.height - p1paddleHeight) / 2;
        rightPaddleX = canvas.width - paddleWidth - 10;
        rightPaddleY = (canvas.height - p2paddleHeight) / 2;
    }


    function draw() {
        // 1. Fond avec dégradé
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#050810');
        gradient.addColorStop(0.5, '#0a0f1a');
        gradient.addColorStop(1, '#050810');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const offset = canvas.width * 0.3; 
        const w = canvas.width;
        const h = canvas.height;
        
        ctx.save(); // Sauvegarde l'état initial
        ctx.lineWidth = 5;
        //ligne du milieu
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // --- PARTIE GAUCHE (Couleur User) ---
        ctx.strokeStyle = userColor;
        //ctx.shadowColor = userColor;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(offset, 0); 
        ctx.lineTo(0, offset);            
        ctx.lineTo(0, h - offset);       
        ctx.lineTo(offset, h);           
        ctx.stroke();

        // --- PARTIE DROITE (Blanc) ---
        ctx.strokeStyle = '#ffffff';
        //ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(w - offset, 0);
        ctx.lineTo(w, offset);           
        ctx.lineTo(w, h - offset);       
        ctx.lineTo(w - offset, h);       
        ctx.stroke();

        // --- BORDURES HAUT ET BAS avec diagonales (Violet) ---
        ctx.strokeStyle = '#000000';
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        // Haut : diagonale gauche + segment horizontal + diagonale droite
        ctx.moveTo(0, offset); ctx.lineTo(offset, 0);
        ctx.lineTo(w - offset, 0); ctx.lineTo(w, offset);
        // Bas : diagonale gauche + segment horizontal + diagonale droite
        ctx.moveTo(0, h - offset); ctx.lineTo(offset, h);
        ctx.lineTo(w - offset, h); ctx.lineTo(w, h - offset);
        ctx.stroke();

        ctx.shadowBlur = 0; // On retire le glow pour le texte et les objets

        // 2. Affichage des Scores
        ctx.textAlign = 'center';
        ctx.font = 'bold 48px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        // Placé au milieu de chaque moitié de terrain
        ctx.fillText(score1, w * 0.25, h / 2); 
        ctx.fillText(score2, w * 0.75, h / 2); 

        // 3. Noms des joueurs
        ctx.font = '13px monospace';
        ctx.fillStyle = userColor; 
        ctx.shadowColor = userColor; 
        ctx.shadowBlur = 8;
        ctx.fillText(name1.toUpperCase(), w * 0.25, h / 2 + 50);
        
        ctx.fillStyle = '#fff'; 
        ctx.shadowColor = '#fff';
        ctx.fillText(name2.toUpperCase(), w * 0.75, h / 2 + 50);
        ctx.shadowBlur = 0;

        // 4. Raquette Gauche (Player 1)
        ctx.shadowColor = userColor; ctx.shadowBlur = 18; ctx.fillStyle = userColor;
        ctx.beginPath(); 
        ctx.roundRect(leftPaddleX, leftPaddleY, paddleWidth, p1paddleHeight, [4]); 
        ctx.fill();

        // 5. Raquette Droite (Player 2 / IA)
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff';
        ctx.beginPath(); 
        ctx.roundRect(rightPaddleX, rightPaddleY, paddleWidth, p2paddleHeight, [4]); 
        ctx.fill();

        // 6. La Balle
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 20; ctx.fillStyle = '#fff';
        ctx.beginPath(); 
        ctx.arc(ballX, ballY, 7, 0, Math.PI * 2); 
        ctx.fill();

        ctx.restore(); // Un seul restore suffit pour fermer le save() du début
    }

    gameLoop();
}
