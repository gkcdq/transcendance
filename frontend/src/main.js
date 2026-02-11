const routes = {
    '/': { title: 'Accueil', render: () => '<h1>Bienvenue sur l\'Accueil</h1><p>Prêt pour un Pong ?</p>' },
    '/game': { title: 'Jeu', render: () => '<h1>Arena</h1><div id="pong-canvas">Le jeu chargera ici.</div>' },
    '/chat': { title: 'Chat', render: () => '<h1>Chat Communautaire</h1><p>Discute avec les autres joueurs.</p>' },
    '/settings': { title: 'Paramètres', render: () => '<h1>Configuration</h1><p>Modifie ton profil.</p>' }
};

const router = () => {
    const path = window.location.pathname;
    const route = routes[path] || routes['/']; // Redirige vers l'accueil si la route n'existe pas

    document.title = `Transcendence - ${route.title}`;
    document.getElementById('app').innerHTML = route.render();
};

// Intercepter les clics sur les liens avec l'attribut data-link
document.addEventListener('click', e => {
    if (e.target.matches('[data-link]')) {
        e.preventDefault(); // Empêche le rechargement de la page
        history.pushState(null, null, e.target.href); // Change l'URL dans la barre d'adresse
        router(); // Appelle le routeur pour mettre à jour le contenu
    }
});

// Gérer le bouton "Précédent" du navigateur
window.addEventListener('popstate', router);

// Lancer le routeur au chargement initial
document.addEventListener('DOMContentLoaded', router);