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
    // parametres globaux
    let startTime     = Date.now();
    let lastBonusTime = 0;
    let isGameOver    = false;
    let animationId;
    const userColor   = userStore.get('user_color', '#00babc');
    const aiBaseSpeed = parseFloat(userStore.get('ai_level', '5.3')) || 5.3;

    // parametres raquettes
    const paddleWidth = 10;
    let p1paddleHeight = 80;
    let p2paddleHeight = 80;
    const PADDLE_MAX_X = canvas.width / 2 - paddleWidth;
    let leftPaddleX  = canvas.width  / 2 - (Math.min(canvas.width/2, canvas.height/2) - 10) + 30;
    let leftPaddleY  = (canvas.height - p1paddleHeight) / 2;
    let rightPaddleX = canvas.width - paddleWidth - (canvas.width / 7);
    let rightPaddleY = (canvas.height - p2paddleHeight) / 2;

    // parametres de la balle
    let ballX = canvas.width / 2, ballY = canvas.height / 2;
    let ballSpeedX = 5, ballSpeedY = 5;
    let score1 = 0, score2 = 0;
    const maxSpeed = 20;

    // parametres des bonus
    let p1Bonuses = [], p2Bonuses = [];
    let p1SpeedMult = 1, p2SpeedMult = 1;
    let p1blockmovement = false;
    let p2blockmovement = false;
    let p1Inverse = false;
    let p2Inverse = false;
    let p1Invisible = false;
    let p2Invisible = false;
    let p1multiballs = false;
    let p2multiballs = false;
    let color_sec = false;
    let p1Canon = false;
    let p2Canon = false;
    let canonActive = false;
    let normalSpeedX = 0;
    let normalSpeedY = 0;
    let iaConfusedDir = 1;
    let iaValide = false;
    let iaInverseConfusedFrames = 0;
    let iaInverseConfusedDir = 0;
    let iaFreezeActive = false;
  

    // Initialise les fausses balles
    let p1FakeBalls = Array.from({length: 30}, () => ({
        x: Math.random() * (canvas.width / 2 - 20) + 10,
        y: Math.random() * (canvas.height - 20) + 10,
        dx: (Math.random() > 0.5 ? 1 : -1) * Math.abs(ballSpeedX),
        dy: (Math.random() > 0.5 ? 1 : -1) * Math.abs(ballSpeedY),
    }));
    let p1BallBlink = false;
    let p2FakeBalls = Array.from({length: 30}, () => ({
        x: Math.random() * (canvas.width / 2 - 20) + canvas.width / 2 + 10,
        y: Math.random() * (canvas.height - 20) + 10,
        dx: (Math.random() > 0.5 ? 1 : -1) * Math.abs(ballSpeedX),
        dy: (Math.random() > 0.5 ? 1 : -1) * Math.abs(ballSpeedY),
    }));
    let p2BallBlink = false;

    // Identifiant des bonus/mallus
    const BONUS_DEFS = [
        { id: 'wall',   label: '🧱 Mur'   }, // le mur du mexique
        { id: 'boost',  label: '⚡ Boost'  }, // accelere sa raquette
        { id: 'freeze', label: '❄️ Freeze' }, // stop la balle
        { id: 'canon', label: '🎳 Canon'}, // coup droit
        { id: 'multiclonage', label: '👺 MALUS'},
        { id: 'i_malus',label: '👺 MALUS'}, // inverse malus
        { id: 'f_malus',label: '👺 MALUS'}, // freeze malus
        { id: 'p_malus', label: '👺 MALUS'}, // raquette mini
        { id: 'y_malus', label: '👺 MALUS'}, // raquette invisible
    ];

    function applyBonus(bonus, side) {
        if(!bonus) return;
        if (bonus.id === 'wall')
        {
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
        else if (bonus.id === 'freeze') {
            if (ballSpeedX === 0 && ballSpeedY === 0) return;
            const ox = ballSpeedX, oy = ballSpeedY;
            if (p2Canon === true || p1Canon === true)
                normalSpeedX = ox; normalSpeedY = oy;
            ballSpeedX = 0; ballSpeedY = 0;
            setTimeout(() => { ballSpeedX = ox; ballSpeedY = oy; }, 2000);
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
        else if (bonus.id === 'y_malus')
        {
            if (side == 'left')
            {
                p2Invisible = true;
                setTimeout(() => {p2Invisible = false}, 3000);

            }
            else
            {
                p1Invisible = true;
                setTimeout(() => {p1Invisible = false}, 5000);
            }
        }
        else if (bonus.id === 'multiclonage')
        {
            if (side === 'left')
            {
                p2multiballs = true;
                setTimeout(() => {p2multiballs = false}, 5000);
                color_sec = true;
                setTimeout(() => {color_sec = false}, 100);
            }
            else
            {
                p1multiballs = true;
                setTimeout(() => {p1multiballs = false}, 5000);
                color_sec = true;
                setTimeout(() => {color_sec = false}, 100);
            }
        }
        else if (bonus.id === 'canon')
        {
            if (side === 'left')
            {
                p1Canon = true;
                if (ballSpeedX !== 30)
                {
                    normalSpeedX = ballSpeedX;
                    normalSpeedY = ballSpeedY;
                }
            }
            else
            {
                p2Canon = true;
                if (ballSpeedX !== 30)
                {
                    normalSpeedX = ballSpeedX;
                    normalSpeedY = ballSpeedY;
                }
            }
        }
        // continuer si les iddeee nous viennent
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

    function gameLoop()
    {
        if (isGameOver) return;
        update(); draw(); renderBonusBar();
        animationId = requestAnimationFrame(gameLoop);
        letCurrentPongInstance(animationId);
    }

    function octagonBounce() {
        const w  = canvas.width;
        const h  = canvas.height;
        const oW = w * 0.3125;
        const oH = h * 0.25;

        // Bords haut/bas
        if (ballY < 0) { ballY = 0; ballSpeedY *= -1; }
        if (ballY > h) { ballY = h; ballSpeedY *= -1; }

        // Buts
        if (ballX < 0) { score2++; score2 >= 5 ? endGame(name2) : resetBall(); return; }
        if (ballX > w) { score1++; score1 >= 5 ? endGame(name1) : resetBall(); return; }

        // Coin haut-gauche
        if (ballX / oW + ballY / oH < 1) {
            if (canonActive) {
                const dirX = Math.sign(ballSpeedX) || 1;
                ballSpeedX = normalSpeedX !== 0 ? Math.abs(normalSpeedX) * dirX : 7;
                ballSpeedY = normalSpeedY !== 0 ? Math.abs(normalSpeedY) : 5;
                canonActive = false;
            } else {
                const t = ballSpeedX;
                ballSpeedX =  Math.abs(ballSpeedY) * (oW / oH);
                ballSpeedY =  Math.abs(t) * (oH / oW);
            }
            ballX = (1 - ballY / oH) * oW + 2;
        }

        // Coin haut-droit
        if ((w - ballX) / oW + ballY / oH < 1) {
            if (canonActive) {
                const dirX = Math.sign(ballSpeedX) || -1;
                ballSpeedX = normalSpeedX !== 0 ? -Math.abs(normalSpeedX) : -7;
                ballSpeedY = normalSpeedY !== 0 ? Math.abs(normalSpeedY) : 5;
                canonActive = false;
            } else {
                const t = ballSpeedX;
                ballSpeedX = -Math.abs(ballSpeedY) * (oW / oH);
                ballSpeedY =  Math.abs(t) * (oH / oW);
            }
            ballX = w - (1 - ballY / oH) * oW - 2;
        }

        // Coin bas-gauche
        if (ballX / oW + (h - ballY) / oH < 1) {
            if (canonActive) {
                ballSpeedX = normalSpeedX !== 0 ? Math.abs(normalSpeedX) : 7;
                ballSpeedY = normalSpeedY !== 0 ? -Math.abs(normalSpeedY) : -5;
                canonActive = false;
            } else {
                const t = ballSpeedX;
                ballSpeedX =  Math.abs(ballSpeedY) * (oW / oH);
                ballSpeedY = -Math.abs(t) * (oH / oW);
            }
            ballX = (1 - (h - ballY) / oH) * oW + 2;
        }

        // Coin bas-droit
        if ((w - ballX) / oW + (h - ballY) / oH < 1) {
            if (canonActive) {
                ballSpeedX = normalSpeedX !== 0 ? -Math.abs(normalSpeedX) : -7;
                ballSpeedY = normalSpeedY !== 0 ? -Math.abs(normalSpeedY) : -5;
                canonActive = false;
            } else {
                const t = ballSpeedX;
                ballSpeedX = -Math.abs(ballSpeedY) * (oW / oH);
                ballSpeedY = -Math.abs(t) * (oH / oW);
            }
            ballX = w - (1 - (h - ballY) / oH) * oW - 2;
        }
    }

    function constrainPaddle(px, py, pH)
    {
        const w   = canvas.width;
        const h   = canvas.height;   
        const oW  = w * 0.3125;     
        const oH  = h * 0.25;       

        let minY = 0, maxY = h - pH;

        // Côté gauche diagonale : y_min = oH * (1 - px/oW)
        if (px < oW) {
            const diagY = oH * (1 - px / oW);
            minY = diagY;
            maxY = h - pH - diagY;
        }
        // Côté droit diagonale : y_min = oH * (1 - (w - px - paddleWidth) / oW)
        else if (px + paddleWidth > w - oW) {
            const excess = px + paddleWidth - (w - oW);
            const diagY  = oH * (excess / oW);
            minY = diagY;
            maxY = h - pH - diagY;
        }
        return Math.max(minY, Math.min(maxY, py));
    }

    function onIaFreeze()
    {
        iaFreezeActive = true;
        setTimeout(() => { iaFreezeActive = false; }, 2000);
    }

    function update()
    {

        if (p1multiballs) {
            p1FakeBalls.forEach(b => {
                const speed = Math.sqrt(ballSpeedX ** 2 + ballSpeedY ** 2) || 6; // fallback si freeze
                const norm  = Math.sqrt(b.dx ** 2 + b.dy ** 2);
                if (norm > 0) { b.dx = b.dx / norm * speed; b.dy = b.dy / norm * speed; }
                // Si les composantes sont nulles (freeze), garde une vitesse minimale
                if (b.dx === 0 && b.dy === 0) { b.dx = speed * 0.7; b.dy = speed * 0.7; }
                if (b.dx === 0) b.dx = speed * 0.7;
                if (b.dy === 0) b.dy = speed * 0.7;
                b.x += b.dx; b.y += b.dy;
                if (b.y <= 7 || b.y >= canvas.height - 7) b.dy *= -1;
                if (b.x <= 7) b.dx = Math.abs(b.dx);
                if (b.x >= canvas.width / 2 - 7) b.dx = -Math.abs(b.dx);
            });
        }
        if (p2multiballs) {
            p2FakeBalls.forEach(b => {
                const speed = Math.sqrt(ballSpeedX ** 2 + ballSpeedY ** 2) || 6;
                const norm  = Math.sqrt(b.dx ** 2 + b.dy ** 2);
                if (norm > 0) { b.dx = b.dx / norm * speed; b.dy = b.dy / norm * speed; }
                if (b.dx === 0 && b.dy === 0) { b.dx = -speed * 0.7; b.dy = speed * 0.7; }
                if (b.dx === 0) b.dx = -speed * 0.7;
                if (b.dy === 0) b.dy =  speed * 0.7;
                b.x += b.dx; b.y += b.dy;
                if (b.y <= 7 || b.y >= canvas.height - 7) b.dy *= -1;
                if (b.x <= canvas.width / 2 + 7) b.dx =  Math.abs(b.dx);
                if (b.x >= canvas.width - 7)     b.dx = -Math.abs(b.dx);
            });
        }
        updateBonus();


























        // joueur gauche
        const speed = 7 * p1SpeedMult, hSpeed = 4 * p1SpeedMult;
        if (p1blockmovement === false)
        {
            if (p1Inverse === false)
            {
                if (keys['w'] || keys['W']) leftPaddleY -= speed;
                if (keys['s'] || keys['S']) leftPaddleY += speed;
                if ((keys['d'] || keys['D']) && leftPaddleX < PADDLE_MAX_X) leftPaddleX += hSpeed;
                if ((keys['a'] || keys['A']) && leftPaddleX > (paddleWidth + paddleWidth - (paddleWidth / 1.5)) / 2) leftPaddleX -= hSpeed;
            }
            else
            {
                if (keys['w'] || keys['W']) leftPaddleY += speed;
                if (keys['s'] || keys['S']) leftPaddleY -= speed;
                if ((keys['d'] || keys['D']) && leftPaddleX > 0 + paddleWidth - 2) leftPaddleX -= hSpeed;
                if ((keys['a'] || keys['A']) && leftPaddleX < canvas.width / 2 - paddleWidth) leftPaddleX += hSpeed;
            }
        }
        // Contraint apres mouvement
        leftPaddleY = constrainPaddle(leftPaddleX, leftPaddleY, p1paddleHeight);

        // IA
        if (name2 === "IA") {

            if (p2blockmovement) {
                
            }
            else if (iaFreezeActive) {
                const centerPaddle = rightPaddleY + p2paddleHeight / 2;
                const targetY = ballY;
                const targetX = Math.max(canvas.width / 2, ballX + 10);
                if (centerPaddle < targetY - 5) rightPaddleY += aiBaseSpeed * 2;
                else if (centerPaddle > targetY + 5) rightPaddleY -= aiBaseSpeed * 2;
                if (rightPaddleX > targetX + 3) rightPaddleX -= hSpeed;
                else if (rightPaddleX < targetX - 3) rightPaddleX += hSpeed;
            }

            // MALUS invisibilité , IA perdue si balle loin, dérive lentement
            else if (p2Invisible && ballX < rightPaddleX - 200)
            {
                rightPaddleY += Math.sin(Date.now() / 300) * 1.5; // dérive lente bas→haut
            }

            // MALUS multiballes , perdue seulement si balle dans sa moitié, 50% chance de suivre une fausse balle
            else if (p2multiballs && ballX > canvas.width / 2) {
                const sp = aiBaseSpeed * p2SpeedMult;
                const centerPaddle = rightPaddleY + p2paddleHeight / 2;

                // 30% de chance de se tromper de direction au moment où la balle arrive
                if (Math.random() < 0.2) {
                    iaConfusedDir = (Math.random() < 0.3) ? -1 : 1; // 30% de mauvaise direction
                }

                const targetY = ballY;
                const direction = (centerPaddle < targetY - 10) ? 1 : (centerPaddle > targetY + 10) ? -1 : 0;

                rightPaddleY += sp * direction * iaConfusedDir;
                rightPaddleY = Math.max(0, Math.min(canvas.height - p2paddleHeight, rightPaddleY));
            }

            // MALUS inversion , se trompe de direction de temps en temps
            else if (p2Inverse)
            {
                const sp = aiBaseSpeed * p2SpeedMult;
                const hs = 4 * p2SpeedMult * 0.6;
                const centerPaddle = rightPaddleY + p2paddleHeight / 2;

                // Décide une direction fixe pour 1-2 secondes
                if (iaInverseConfusedFrames === 0 && Math.random() < 0.008) {
                    iaInverseConfusedFrames = 60 + Math.floor(Math.random() * 60);
                    iaInverseConfusedDir = Math.random() < 0.5 ? canvas.height : 0; // fixé une fois
                }

                let targetY;
                if (iaInverseConfusedFrames > 0) {
                    targetY = iaInverseConfusedDir; // direction fixe, ne change pas
                    iaInverseConfusedFrames--;
                } else {
                    targetY = ballSpeedX > 0 ? ballY : canvas.height / 2;
                }

                if (centerPaddle < targetY - 10) rightPaddleY += sp;
                else if (centerPaddle > targetY + 10) rightPaddleY -= sp;
                rightPaddleY = Math.max(0, Math.min(canvas.height - p2paddleHeight, rightPaddleY));
                const targetX = ballSpeedX > 0
                    ? Math.max(canvas.width / 2, ballX - 60)
                    : canvas.width - paddleWidth - 10;
                if (rightPaddleX > targetX + 3) rightPaddleX -= hs;
                else if (rightPaddleX < targetX - 3) rightPaddleX += hs;
                rightPaddleX = Math.max(canvas.width / 2, Math.min(canvas.width - paddleWidth - 10, rightPaddleX));
            }

            // Comportement normal
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
                    if (keys['ArrowRight'] && rightPaddleX < canvas.width - (paddleWidth * 2 - ((paddleWidth / 1.5)))) rightPaddleX += hs2;
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
        if (name2 === 'IA' && p2Bonuses.length > 0)
        {
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
            else
            {
                setTimeout(() => {applyBonus(p2Bonuses.shift(), 'right')}, 2000)
            }
        }
        // Contraint après mouvement
        rightPaddleY = constrainPaddle(rightPaddleX, rightPaddleY, p2paddleHeight);
        ballX += ballSpeedX; ballY += ballSpeedY;
        octagonBounce();
        // Collision raquette droite
        if (ballSpeedX > 0)
        {
            const prevBallX = ballX - ballSpeedX;
            if (prevBallX < rightPaddleX + paddleWidth && ballX >= rightPaddleX) {
                if (ballY + 6 > rightPaddleY && ballY - 6 < rightPaddleY + p2paddleHeight) {
                    ballX = rightPaddleX - 1;
                if (p2Canon) {
                    normalSpeedX = Math.abs(ballSpeedX) || 7;  // ← sauvegarde ici
                    normalSpeedY = Math.abs(ballSpeedY) || 5;
                    ballSpeedY = 0;
                    ballSpeedX = -30;
                    p2Canon = false;
                    canonActive = true;
                } else if (canonActive) {
                    if (normalSpeedX === 30)
                    {
                        normalSpeedX = 10;
                        normalSpeedY = 10;
                    }
                        // Raquette adverse touchée , restore vitesse normale
                        ballSpeedX = -normalSpeedX;
                        if (normalSpeedY === 0)
                            normalSpeedY = -7;
                        ballSpeedY = normalSpeedY;
                        canonActive = false;
                    } else {
                        ballSpeedX = -Math.min(Math.abs(ballSpeedX) * 1.1, maxSpeed);
                    }
                }
            }
        }

        // Collision raquette gauche
        if (ballSpeedX < 0)
        {
            const prevBallX = ballX - ballSpeedX;
            if (prevBallX > leftPaddleX && ballX <= leftPaddleX + paddleWidth) {
                if (ballY + 6 > leftPaddleY && ballY - 6 < leftPaddleY + p1paddleHeight) {
                    ballX = leftPaddleX + paddleWidth + 1;
                if (p1Canon) {
                    normalSpeedX = Math.abs(ballSpeedX) || 7;  // ← sauvegarde ici
                    normalSpeedY = Math.abs(ballSpeedY) || 5;
                    ballSpeedY = 0;
                    ballSpeedX = 30;
                    p1Canon = false;
                    canonActive = true;
                } else if (canonActive) {
                    if (normalSpeedX === 30)
                    {
                        normalSpeedX = 10;
                        normalSpeedY = 10;
                    }
                        ballSpeedX = normalSpeedX;
                        if (normalSpeedY === 0)
                            normalSpeedY = 7;
                        ballSpeedY = normalSpeedY;
                        canonActive = false;
                    } else {
                        ballSpeedX = Math.min(Math.abs(ballSpeedX) * 1.1, maxSpeed);
                    }
                }
            }
        }

        if (ballX <= 0) { score2++; if (score2 === 5) endGame(name2); else resetBall(); }
        else if (ballX >= canvas.width) { score1++; if (score1 === 5) endGame(name1); else resetBall(); }
    }

    async function endGame(winnerName)
    {
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

    function resetBall()
    {
        ballX = canvas.width / 2; ballY = canvas.height / 2;
        ballSpeedX = (Math.random() > 0.5 ? 5 : -5);
        ballSpeedY = (Math.random() > 0.5 ? 5 : -5);
        leftPaddleX  = canvas.width / 2 - (Math.min(canvas.width / 2, canvas.height / 2) - 10);
        leftPaddleY  = (canvas.height - p1paddleHeight) / 2;
        rightPaddleX = canvas.width - paddleWidth - (canvas.width / 7);
        rightPaddleY = (canvas.height - p2paddleHeight) / 2;
        p1SpeedMult = 1, p2SpeedMult = 1;
        p1blockmovement = false;
        p2blockmovement = false;
        p1Inverse = false;
        p2Inverse = false;
        p1Invisible = false;
        p2Invisible = false;
        p1multiballs = false;
        p2multiballs = false;
        color_sec = false;
        p1Canon = false;
        p2Canon = false;
        canonActive = false;
        normalSpeedX = 0;
        normalSpeedY = 0;
        iaConfusedDir = 1;
        iaInverseConfusedFrames = 0;
        iaInverseConfusedDir = 0;
        iaFreezeActive = false;
        p1paddleHeight = 80;
        p2paddleHeight = 80;
        
    }


    function draw()
    {
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
        if (p1Invisible == false)
        {
            ctx.shadowColor = userColor; ctx.shadowBlur = 18; ctx.fillStyle = userColor;
            ctx.beginPath();
            ctx.roundRect(leftPaddleX, leftPaddleY, paddleWidth, p1paddleHeight, [4]);
            ctx.fill();
        }
        else
        {
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.beginPath();
            ctx.roundRect(leftPaddleX, leftPaddleY, paddleWidth, p1paddleHeight, [4]);
            ctx.fill();
        }

        // 5. Raquette droite
        if (p2Invisible === false)
        {
            ctx.shadowColor = '#fff'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.roundRect(rightPaddleX, rightPaddleY, paddleWidth, p2paddleHeight, [4]);
            ctx.fill();
        }
        else
        {
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.beginPath();
            ctx.roundRect(rightPaddleX, rightPaddleY, paddleWidth, p2paddleHeight, [4]);
            ctx.fill();
        }

        if (p1multiballs)
        {
            ctx.shadowColor = '#fff'; ctx.shadowBlur = 8; ctx.fillStyle = '#fff';
            p1FakeBalls.forEach(b => {
                ctx.beginPath();
                ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        // Fausses balles P2
        if (p2multiballs)
        {
            ctx.shadowColor = '#fff'; ctx.shadowBlur = 8; ctx.fillStyle = '#fff';
            p2FakeBalls.forEach(b => {
                ctx.beginPath();
                ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    // Vraie balle — une seule fois
    const anyMultiballs = p1multiballs || p2multiballs;
    const anyBlink      = p1BallBlink  || p2BallBlink;
    if (anyMultiballs && anyBlink) {
        // Frame éteinte — invisible
    } else {
        if (color_sec === true)
            ctx.shadowColor = '#ff0055';
        else
            ctx.shadowColor = '#ffffff';
        ctx.shadowBlur  = 8;
        if (color_sec === true)
            ctx.fillStyle = '#ff0055';
        else
            ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 7, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;

        ctx.restore();
    }

    gameLoop();
}
