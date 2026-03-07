const routes = {
    '/': '<h1>Bienvenue sur Transcendence</h1><button id="login-42">Login with 42</button>',
    '/game': '<h1>Le Jeu</h1><canvas id="pongCanvas" width="800" height="600"></canvas>',
    '/profile': '<h1>Ton Profil</h1><div id="profile-data">Chargement...</div>'
};

function navigateTo(path) {
    window.history.pushState({}, path, window.location.origin + path);
    render(path);
}

function render(path) {
    const content = routes[path] || '<h1>404 Not Found</h1>';
    document.getElementById('app').innerHTML = content;
    if (path === '/profile') {
        fetchProfile();
    }
}

// bouton retour du navigateur
window.onpopstate = () => render(window.location.pathname);

// premier chagment
render(window.location.pathname);