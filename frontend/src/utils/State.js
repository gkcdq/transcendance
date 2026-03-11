// OnlinePong
export let isOnline = 0;
export function setOnlineStatus(value){isOnline = value;}

// Si on quitte une instance "local"
export let currentPongInstance = null;
export function letCurrentPongInstance(value){currentPongInstance = value;}
export function returnCurrentPongInstance(){return currentPongInstance;}

// socket du chat global
export let globalChatWS = null;
export function setGlobalChatWS(value){globalChatWS = value;}
export function returnGlobalChatWS(){return globalChatWS;}

// navbar lock unlock
export function lockNav() {
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

// pour l'admin
export function lockNavAdmin() {
    document.querySelectorAll('.nav-links li').forEach(li => {
        if (li.id !== 'admin-nav-btn' && li.id !== 'nav-chat' && li.id !== 'nav-leaderboard' && li.id !== 'nav-home') {
            li.style.display = 'none';
        }
    });
}

export function unlockNav() {
    sessionStorage.removeItem('active_room');
    document.querySelectorAll('.nav-links a').forEach(a => {
        a.style.pointerEvents = '';
        a.style.opacity = '';
    });
    document.getElementById('nav-match-badge')?.remove();
}

// pour naviguer dans la page gg
export function navigateTo(url) {
    const instance = returnCurrentPongInstance();
    if (instance) { cancelAnimationFrame(instance); letCurrentPongInstance(null); }
    window.dispatchEvent(new CustomEvent('navigate-away'));
    history.pushState(null, null, url);
    window.dispatchEvent(new PopStateEvent('popstate'));
}
