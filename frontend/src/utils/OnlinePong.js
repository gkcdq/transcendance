import { userStore } from './userStore.js';
import { lockNav, unlockNav, setOnlineStatus, navigateTo} from './State.js';

export function initOnlinePong(roomId) {
    sessionStorage.setItem('active_room', roomId);
    setOnlineStatus(1);
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
        if ((e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') && !keys[e.key]) { keys[e.key] = true; ws.send(JSON.stringify({ type:'input', key:'up' })); }
        if ((e.key === 'ArrowDown'  || e.key === 's' || e.key === 'S') && !keys[e.key]) { keys[e.key] = true; ws.send(JSON.stringify({ type:'input', key:'down' })); }
        if ((e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') && !keys[e.key]) { keys[e.key] = true; ws.send(JSON.stringify({ type:'input', key:'left' })); }   
        if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && !keys[e.key]) { keys[e.key] = true; ws.send(JSON.stringify({ type:'input', key:'right' })); } 
    };
    const onUp = (e) => { delete keys[e.key]; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup',   onUp);

    const inputLoop = setInterval(() => {
        if (gameOver || !mySide || ws.readyState !== WebSocket.OPEN) return;
        if (keys['ArrowUp']    || keys['w'] || keys['W']) ws.send(JSON.stringify({ type:'input', key:'up' }));
        if (keys['ArrowDown']  || keys['s'] || keys['S']) ws.send(JSON.stringify({ type:'input', key:'down' }));
        if (keys['ArrowLeft']  || keys['a'] || keys['A']) ws.send(JSON.stringify({ type:'input', key:'left' }));   
        if (keys['ArrowRight'] || keys['d'] || keys['D']) ws.send(JSON.stringify({ type:'input', key:'right' }));  
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
                lockNav();
                state = data.state;
                if (statusText) statusText.style.display = 'none';
                if (!animId) animId = requestAnimationFrame(renderLoop);
                break;
            case 'game_tick':
                state = data.state;
                break;
            case 'game_over':
                unlockNav();
                setOnlineStatus(0);
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

        // Scoresw
        ctx.textAlign = 'center';
        ctx.font = 'bold 48px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillText(s.left.score,  canvas.width / 4,       70);
        ctx.fillText(s.right.score, (canvas.width / 4) * 3, 70);

        // nom
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

        // Raqutte droite
        ctx.shadowColor = rightColor; ctx.shadowBlur = 15;
        ctx.fillStyle = rightColor;
        ctx.beginPath();
        ctx.roundRect(s.right.x, s.right.y, PW, PH, [4,4,4,4]); ctx.fill();
        ctx.fill();

        // bballe
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
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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