import { userStore } from './userStore.js';
import { letCurrentPongInstance } from './State.js';
import { tournamentState } from '../main.js';
import { navigateTo } from './State.js';

export function initPongGame(p1Name = "Player", p2Name = "IA") {
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
    const PADDLE_MAX_X = canvas.width / 2 - paddleWidth;
    let leftPaddleX  = 0;
    let leftPaddleY  = (canvas.height - paddleHeight) / 2;
    let rightPaddleX = canvas.width - paddleWidth;
    let rightPaddleY = (canvas.height - paddleHeight) / 2;

    let ballX = canvas.width / 2, ballY = canvas.height / 2;
    let ballSpeedX = 5, ballSpeedY = 5;
    let score1 = 0, score2 = 0;
    const keys = {};
    let capslock = false;
    const handleKeyDown = e => {
        if (e.key === 'CapsLock') capslock = true;
        if (['w','s','a','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
            if (document.activeElement.tagName !== 'INPUT') e.preventDefault();
        }
        keys[e.key] = true;
    };
    const handleKeyUp = e => {
        keys[e.key] = false;
        if (e.key === 'CapsLock' || e.key === 'Shift')
        {
            capslock = false;
            keys['w'] = false; keys['W'] = false;
            keys['a'] = false; keys['A'] = false;
            keys['s'] = false; keys['S'] = false;
            keys['d'] = false; keys['D'] = false;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup',   handleKeyUp);
    function gameLoop() {
        if (isGameOver) return;
        update(); draw();
        animationId = requestAnimationFrame(gameLoop);
        letCurrentPongInstance(animationId);
    }

    function update() {
        const speed = 7, hSpeed = 4;
        if (capslock === false)
        {
            if ((keys['w'] || keys['W']) && leftPaddleY > 0) leftPaddleY -= speed;
            if ((keys['s'] || keys['S']) && leftPaddleY < canvas.height - paddleHeight) leftPaddleY += speed;
            if ((keys['d'] || keys['D']) && leftPaddleX < PADDLE_MAX_X) leftPaddleX += hSpeed;
            if ((keys['a'] || keys['A']) && leftPaddleX > 0) leftPaddleX -= hSpeed;
        }
        if (name2 === "IA") {
            const centerPaddle = rightPaddleY + paddleHeight / 2;
            const targetY = ballSpeedX > 0 ? ballY : canvas.height / 2;
            if (centerPaddle < targetY - 10) rightPaddleY += aiBaseSpeed;
            else if (centerPaddle > targetY + 10) rightPaddleY -= aiBaseSpeed;
            const targetX = ballSpeedX > 0
                ? Math.max(canvas.width - paddleWidth - PADDLE_MAX_X, ballX - 60)
                : canvas.width - paddleWidth;
            if (rightPaddleX > targetX + 3) rightPaddleX -= hSpeed * 0.6;
            else if (rightPaddleX < targetX - 3) rightPaddleX += hSpeed * 0.6;
            rightPaddleX = Math.max(canvas.width / 2, Math.min(canvas.width - paddleWidth, rightPaddleX));
        } else {
            if (keys['ArrowUp']    && rightPaddleY > 0)                            rightPaddleY -= speed;
            if (keys['ArrowDown']  && rightPaddleY < canvas.height - paddleHeight) rightPaddleY += speed;
            if (keys['ArrowLeft']  && rightPaddleX > canvas.width / 2)             rightPaddleX -= hSpeed;
            if (keys['ArrowRight'] && rightPaddleX < canvas.width - paddleWidth)   rightPaddleX += hSpeed;
        }
        ballX += ballSpeedX; ballY += ballSpeedY;
        if (ballY <= 0 || ballY >= canvas.height) ballSpeedY = -ballSpeedY;
        const maxSpeed = 20;
        if (ballSpeedX > 0) {
            const prevBallX = ballX - ballSpeedX;
            if (prevBallX < rightPaddleX + paddleWidth && ballX >= rightPaddleX) {
                if (ballY + 6 > rightPaddleY && ballY - 6 < rightPaddleY + paddleHeight) {
                    ballX = rightPaddleX - 1;
                    ballSpeedX = -Math.min(Math.abs(ballSpeedX) * 1.1, maxSpeed);
                }
            }
        }
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
            leftPaddleX = 0;
            leftPaddleY  = (canvas.height - paddleHeight) / 2;
            rightPaddleX = canvas.width - paddleWidth;
            rightPaddleY = (canvas.height - paddleHeight) / 2;
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
            ctx.fillText(name1.toUpperCase(), canvas.width / 4,20);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.fillText(name2.toUpperCase(), (canvas.width / 4) * 3, 20);
            ctx.shadowBlur = 0;

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