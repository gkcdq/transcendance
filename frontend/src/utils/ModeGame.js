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
    canvas.width = 1000;
    canvas.height = 750;
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
    let ballSpeedX = 0, ballSpeedY = 0;
    let score1 = 0, score2 = 0;

    let p1Bonuses = [], p2Bonuses = [];
    let p1SpeedMult = 1, p2SpeedMult = 1;
    let p1blockmovement = false;
    let p2blockmovement = false;
    let p1Inverse = false;
    let p2Inverse = false;

    const BONUS_DEFS = [
        // { id: 'wall',   label: '🛡️ Mur'   },
        // { id: 'boost',  label: '⚡ Boost'  },
        // { id: 'freeze', label: '❄️ Freeze' },
        // { id: 's_malus',label: '👺 MALUS'}, // speed malus
        { id: 'i_malus',label: '👺 MALUS'}, // inverse malus
        // { id: 'f_malus',label: '👺 MALUS'}, // freeze malus
        // { id: 'p_malus', label: '👺 MALUS'}, // raqutte mini
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
        }
        else if (bonus.id === 'boost')
        {
            if (side === 'left') { p1SpeedMult = 2; setTimeout(() => { p1SpeedMult = 1; }, 5000); }
            else { p2SpeedMult = 2; setTimeout(() => { p2SpeedMult = 1; }, 5000); }
        }
        else if (bonus.id === 'freeze')
        {
            if (ballSpeedX === 0 && ballSpeedY === 0) return;
            const ox = ballSpeedX, oy = ballSpeedY;
            ballSpeedX = 0; ballSpeedY = 0;
            setTimeout(() => { ballSpeedX = ox; ballSpeedY = oy; }, 2000);
        }
        else if (bonus.id === 's_malus')
        {
            if (side === 'left')
            {
                { p2SpeedMult = 4; setTimeout(() => { p2SpeedMult = 1; }, 5000); }
            }
            else
            {
                { p1SpeedMult = 4; setTimeout(() => { p2SpeedMult = 1; }, 5000); }
            }
        }
        else if (bonus.id === 'i_malus')
        {
            if (side === 'left')
            {
                p2Inverse = true;
                setTimeout(() => { p2Inverse = false }, 5000);
            }
            else
            {
               p1Inverse = true;
               setTimeout(() => { p1Inverse = false }, 5000);
            }
        }
        else if (bonus.id === 'f_malus')
        {
            if (side === 'left')
            {
                p2blockmovement = true;
                setTimeout(() => { p2blockmovement = false; }, 2000); 
            }
            else
            {
                p1blockmovement = true;
                setTimeout(() => { p1blockmovement = false; }, 2000);
            }
        }
        else if (bonus.id === 'p_malus')
        {
            if (side === 'left')
            {
                p2paddleHeight = 40;
                setTimeout(() => {p2paddleHeight = 80}, 3000);
            }   
            else
            {
                p1paddleHeight = 40;
                setTimeout(() => {p1paddleHeight = 80}, 3000);
            }
        }
        // continuer
    }

    function updateBonus() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed % 10 === 0 && elapsed !== lastBonusTime && elapsed !== 0) {
            lastBonusTime = elapsed;
            const b1 = BONUS_DEFS[Math.floor(Math.random() * BONUS_DEFS.length)];
            const b2 = BONUS_DEFS[Math.floor(Math.random() * BONUS_DEFS.length)];
            if (p1Bonuses.length < 3) p1Bonuses.push(b1);
            if (p2Bonuses.length < 3) p2Bonuses.push(b2);
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
        if (e.key === 'Shift' || e.key === 'CapsLock') { keys['W'] = false; keys['A'] = false; keys['S'] = false; keys['D'] = false; keys['w'] = false; keys['a'] = false; keys['s'] = false; keys['d'] = false; shiftUsed = false;}
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
        const w  = canvas.width;   // 1000
        const h  = canvas.height;  // 750
        const oW = w * 0.3125;     // 312.5px — offset horizontal
        const oH = h * 0.25;       // 187.5px — offset vertical

        // Bords haut/bas
        if (ballY < 0) { ballY = 0; ballSpeedY *= -1; }
        if (ballY > h) { ballY = h; ballSpeedY *= -1; }

        // Buts gauche/droite (goals)
        if (ballX < 0) { score2++; score2 >= 5 ? endGame(name2) : resetBall(); return; }
        if (ballX > w) { score1++; score1 >= 5 ? endGame(name1) : resetBall(); return; }

        // Coin haut-gauche : x/oW + y/oH < 1
        if (ballX / oW + ballY / oH < 1) {
            const t = ballSpeedX;
            ballSpeedX =  Math.abs(ballSpeedY) * (oW / oH);
            ballSpeedY =  Math.abs(t)          * (oH / oW);
            // Repousse la balle hors du coin
            ballX = (1 - ballY / oH) * oW + 1;
        }

        // Coin haut-droit : (w-x)/oW + y/oH < 1
        if ((w - ballX) / oW + ballY / oH < 1) {
            const t = ballSpeedX;
            ballSpeedX = -Math.abs(ballSpeedY) * (oW / oH);
            ballSpeedY =  Math.abs(t)          * (oH / oW);
            ballX = w - (1 - ballY / oH) * oW - 1;
        }

        // Coin bas-gauche : x/oW + (h-y)/oH < 1
        if (ballX / oW + (h - ballY) / oH < 1) {
            const t = ballSpeedX;
            ballSpeedX =  Math.abs(ballSpeedY) * (oW / oH);
            ballSpeedY = -Math.abs(t)          * (oH / oW);
            ballX = (1 - (h - ballY) / oH) * oW + 1;
        }

        // Coin bas-droit : (w-x)/oW + (h-y)/oH < 1
        if ((w - ballX) / oW + (h - ballY) / oH < 1) {
            const t = ballSpeedX;
            ballSpeedX = -Math.abs(ballSpeedY) * (oW / oH);
            ballSpeedY = -Math.abs(t)          * (oH / oW);
            ballX = w - (1 - (h - ballY) / oH) * oW - 1;
        }
    }

    function constrainPaddle(px, py, pH) {
        const w   = canvas.width;    // 1000
        const h   = canvas.height;   // 750
        const oW  = w * 0.3125;      // 312.5px
        const oH  = h * 0.25;        // 187.5px

        let minY = 0, maxY = h - pH;

        // Côté gauche — diagonale : y_min = oH * (1 - px/oW)
        if (px < oW) {
            const diagY = oH * (1 - px / oW);
            minY = diagY;
            maxY = h - pH - diagY;
        }
        // Côté droit — diagonale : y_min = oH * (1 - (w - px - paddleWidth) / oW)
        else if (px + paddleWidth > w - oW) {
            const excess = px + paddleWidth - (w - oW);
            const diagY  = oH * (excess / oW);
            minY = diagY;
            maxY = h - pH - diagY;
        }

        return Math.max(minY, Math.min(maxY, py));
    }
    let iaFreezeActive = false;
    function onIaFreeze() {
        iaFreezeActive = true;
        setTimeout(() => { iaFreezeActive = false; }, 2000); // durée du freeze
    }
    function update() {
        console.log("y = ", rightPaddleY);
        console.log("x = ", rightPaddleX);
        console.log("canva = ", canvas.width * 0.90);
        console.log("ballX = ", ballX);
        updateBonus();


























        // ── Joueur gauche ──
        const speed = 7 * p1SpeedMult, hSpeed = 4 * p1SpeedMult;
        if (p1blockmovement === false)
        {
            if (p1Inverse === false)
            {
                if (keys['w'] || keys['W']) leftPaddleY -= speed;
                if (keys['s'] || keys['S']) leftPaddleY += speed;
                if ((keys['d'] || keys['D']) && leftPaddleX < PADDLE_MAX_X) leftPaddleX += hSpeed;
                if ((keys['a'] || keys['A']) && leftPaddleX > paddleWidth / 2 - 3) leftPaddleX -= hSpeed;
            }
            else
            {
                if (keys['w'] || keys['W']) leftPaddleY += speed;
                if (keys['s'] || keys['S']) leftPaddleY -= speed;
                if ((keys['d'] || keys['D']) && leftPaddleX > 0 + paddleWidth - 2) leftPaddleX -= hSpeed;
                if ((keys['a'] || keys['A']) && leftPaddleX < canvas.width / 2 - paddleWidth) leftPaddleX += hSpeed;
            }
        }
        // Contraint après mouvement
        leftPaddleY = constrainPaddle(leftPaddleX, leftPaddleY, p1paddleHeight);

        // IA
        if (name2 === "IA") {
        
            if (iaFreezeActive)
            {
                const centerPaddle = rightPaddleY + p2paddleHeight / 2;
                if (iaFreezeActive)
                {
                    const targetY = ballY;
                    const targetX = Math.max(canvas.width / 2, ballX + 10);
                    if (centerPaddle < targetY - 5) rightPaddleY += aiBaseSpeed * 2;
                    else if (centerPaddle > targetY + 5) rightPaddleY -= aiBaseSpeed * 2;
                    if (rightPaddleX > targetX + 3) rightPaddleX -= hSpeed;
                    else if (rightPaddleX < targetX - 3) rightPaddleX += hSpeed;
                }
            }
            else
            {
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
        
            }
        } 
        else
        {
            const sp2 = 7 * p2SpeedMult, hs2 = 4 * p2SpeedMult;
            if (p2blockmovement === false)
            {
                if (p2Inverse === false)
                {
                    if (keys['ArrowUp']) rightPaddleY -= sp2;
                    if (keys['ArrowDown'])  rightPaddleY += sp2;
                    if (keys['ArrowLeft']  && rightPaddleX > canvas.width / 2) rightPaddleX -= hs2;
                    if (keys['ArrowRight'] && rightPaddleX < canvas.width - paddleWidth) rightPaddleX += hs2;
                }
                else
                {
                    if (keys['ArrowUp']) rightPaddleY += sp2;
                    if (keys['ArrowDown'])  rightPaddleY -= sp2;
                    if (keys['ArrowLeft']  && rightPaddleX < canvas.width - paddleWidth) rightPaddleX += hs2;
                    if (keys['ArrowRight'] && rightPaddleX > canvas.width / 2 + 2) rightPaddleX -= hs2;
                }
            }
        }
        if (name2 === 'IA' && p2Bonuses.length > 0) {
            const bonus = p2Bonuses[0];
            const ballGoingRight = ballSpeedX > 0;
            const ballAligned    = ballY >= rightPaddleY && ballY <= rightPaddleY + p2paddleHeight;
            const ballClose      = ballX >= canvas.width * 0.65;
            if (bonus.id === 'wall') {
                if (ballGoingRight && ballClose && !ballAligned)
                    applyBonus(p2Bonuses.shift(), 'right');
            }
            else if (bonus.id === 'freeze') {
                if (ballX > canvas.width * 0.90)
                {
                    applyBonus(p2Bonuses.shift(), 'right');
                    onIaFreeze();
                }
                
            }
            else if (bonus.id === 'boost') {
                if (ballGoingRight && ballClose && ballAligned)
                    applyBonus(p2Bonuses.shift(), 'right');
            }
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

        if (ballX <= 0) { score2++; if (score2 === 5) endGame(name2); else resetBall(); }
        else if (ballX >= canvas.width) { score1++; if (score1 === 5) endGame(name1); else resetBall(); }
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
        ballSpeedX = (Math.random() > 0.5 ? 15 : -15);
        ballSpeedY = (Math.random() > 0.5 ? 15 : -15);
        leftPaddleX  = canvas.width / 2 - (Math.min(canvas.width / 2, canvas.height / 2) - 10);
        leftPaddleY  = (canvas.height - p1paddleHeight) / 2;
        rightPaddleX = canvas.width - paddleWidth - 10;
        rightPaddleY = (canvas.height - p2paddleHeight) / 2;
    }


    function draw() {
        const w = canvas.width;   // 1000
        const h = canvas.height;  // 750
        const offsetW = w * 0.3125; // 312.5px — coins haut/bas (axe X)
        const offsetH = h * 0.25;   // 187.5px — coins gauche/droite (axe Y)

        // 1. Fond
        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, '#050810');
        gradient.addColorStop(0.5, '#0a0f1a');
        gradient.addColorStop(1, '#050810');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        ctx.save();

        // Ligne du milieu
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.lineWidth = 3;

        // --- GAUCHE (userColor) ---
        ctx.strokeStyle = userColor;
        ctx.shadowColor = userColor;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(0, offsetH);
        // ctx.lineTo(offsetW, 0);       // diagonale haut-gauche (vers haut)
        ctx.moveTo(0, offsetH);
        ctx.lineTo(0, h - offsetH);   // segment vertical gauche (le but)
        //ctx.lineTo(offsetW, h);       // diagonale bas-gauche (vers bas)
        ctx.stroke();

        // --- DROITE (blanc) ---
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(w, offsetH);
       // ctx.lineTo(w - offsetW, 0);   // diagonale haut-droite
        ctx.moveTo(w, offsetH);
        ctx.lineTo(w, h - offsetH);   // segment vertical droit (le but)
        // ctx.lineTo(w - offsetW, h);   // diagonale bas-droite
        ctx.stroke();

        // --- HAUT + BAS (noir/invisible — séparateurs) ---
        ctx.strokeStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        // Haut
        ctx.moveTo(offsetW, 0);
        ctx.lineTo(w - offsetW, 0);
        ctx.moveTo(w, offsetH);
        ctx.lineTo(w - offsetW, 0);
        ctx.moveTo(0, offsetH);
        ctx.lineTo(offsetW, 0);
        ctx.moveTo(0, offsetW + 250);
        ctx.lineTo(offsetW, h); 
        // Bas
        ctx.moveTo(offsetW, h);
        ctx.lineTo(w - offsetW, h);
        ctx.moveTo(w, offsetW + 250);
        ctx.lineTo(w - offsetW, h);
        ctx.stroke();

        ctx.shadowBlur = 0;

        // 2. Scores

        ctx.textAlign = 'center';
        ctx.font = 'bold 48px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillText(Math.min(score1, 5), w * 0.25, h / 2);
        ctx.fillText(Math.min(score2, 5), w * 0.75, h / 2);

        // 3. Noms
        ctx.font = '13px monospace';
        ctx.fillStyle = userColor; ctx.shadowColor = userColor; ctx.shadowBlur = 8;
        ctx.fillText(name1.toUpperCase(), w * 0.25, h / 2 + 50);
        ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff';
        ctx.fillText(name2.toUpperCase(), w * 0.75, h / 2 + 50);
        ctx.shadowBlur = 0;

        // 4. Raquette gauche
        ctx.shadowColor = userColor; ctx.shadowBlur = 18; ctx.fillStyle = userColor;
        ctx.beginPath();
        ctx.roundRect(leftPaddleX, leftPaddleY, paddleWidth, p1paddleHeight, [4]);
        ctx.fill();

        // 5. Raquette droite
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.roundRect(rightPaddleX, rightPaddleY, paddleWidth, p2paddleHeight, [4]);
        ctx.fill();

        // 6. Balle
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 20; ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    gameLoop();
}
