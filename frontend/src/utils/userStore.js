const API_BASE = '/api/users';

// Helpers fetch avec CSRF Django
export function getCsrfToken() {
    // Essaie dabord le cookie csrftoken
    const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='));
    if (cookie) return cookie.split('=')[1];
    
    // Fallback : cherche dans le DOM
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
}

async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
            ...options.headers,
        },
        ...options,
    });
    if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
    return res.json();
}

// cle localStorage directiob champs API Django
const LS_KEYS = {
    user_name:          'username',
    user_avatar:        'avatar',
    pong_wins:          'wins',
    pong_losses:        'losses',
    user_color:         'paddle_color',
    ai_level:           'ai_difficulty',
    user_xp:            'xp',
    pong_total_seconds: 'total_seconds',
};

// Store principal
export const userStore = {
    _cache: {},
    _isAuthenticated: false,
    /**
     * init() — À appeler une fois au chargement de l'app.
     * Si l'utilisateur est connecté (session Django active),
     * prend le cache depuis l'API et met à jour le localStorage.
     * s=inon lit le localStorage comme avant.
     */
    async init() {
        try {
            const data = await apiFetch('/me/');
            this._isAuthenticated = true;
            this._cache = {
                user_name:          data.username,
                user_avatar:        data.avatar,
                pong_wins:          data.wins,
                pong_losses:        data.losses,
                user_color:         data.paddle_color || '#00babc',
                ai_level:           data.ai_difficulty || '5',
                user_xp:            data.xp || 0,
                pong_total_seconds: data.total_seconds || 0,
                is_staff:           String(data.is_staff),
            };
            localStorage.setItem('is_staff', String(data.is_staff));
            this._syncToLocalStorage();
        } catch {
            this._isAuthenticated = false;
            this._loadFromLocalStorage();
        }
        return this._cache;
    },

    /** Lecture synchrone depuis le cache */
    get(lsKey, fallback = null) {
        return this._cache[lsKey] ?? localStorage.getItem(lsKey) ?? fallback;
    },

    /**
     * Écriture : localStorage immédiat + PATCH API si connecté.
     * @param {string} lsKey  - clé localStorage historique (ex: 'pong_wins')
     * @param {*}      value  - valeur à sauvegarder
     */
    async set(lsKey, value) {
        this._cache[lsKey] = value;
        localStorage.setItem(lsKey, value);

        if (this._isAuthenticated) {
            const apiField = LS_KEYS[lsKey];
            if (apiField) {
                try {
                    await apiFetch('/me/update/', {
                        method: 'PATCH',
                        body: JSON.stringify({ [apiField]: value }),
                    });
                } catch (err) {
                    console.warn(`[userStore] PATCH ${lsKey} échoué, localStorage conservé`, err);
                }
            }
        }
    },

    /**
     * Enregistre un match terminé (wins/losses + historique + XP + temps)
     * Remplace les 4-5 localStorage.setItem dispersés dans main.js
     */
    async recordMatch({ isVictory, score1, score2, opponentName, durationSeconds = 0 }) {
        const wins    = parseInt(this.get('pong_wins', 0));
        const losses  = parseInt(this.get('pong_losses', 0));
        const xp      = parseInt(this.get('user_xp', 0));
        const seconds = parseInt(this.get('pong_total_seconds', 0));

        const newWins   = isVictory ? wins + 1 : wins;
        const newLosses = isVictory ? losses : losses + 1;
        const newXp     = xp + (isVictory ? 100 : 20);
        const newSecs   = seconds + durationSeconds;

        //  Maj dy cache + localStorage seul 
        this._cache['pong_wins'] = newWins;
        this._cache['pong_losses']= newLosses;
        this._cache['user_xp'] = newXp;
        this._cache['pong_total_seconds'] = newSecs;
        localStorage.setItem('pong_wins', newWins);
        localStorage.setItem('pong_losses', newLosses);
        localStorage.setItem('user_xp', newXp);
        localStorage.setItem('pong_total_seconds', newSecs);

        // Historique local
        const history = JSON.parse(localStorage.getItem('match_history') || '[]');
        history.unshift({
            date:     new Date().toLocaleString(),
            result:   isVictory ? 'Victoire' : 'Défaite',
            score:    `${score1} - ${score2}`,
            opponent: opponentName,
        });
        localStorage.setItem('match_history', JSON.stringify(history.slice(0, 10)));

        // Un seul appel API qui gere tout en DB
        if (this._isAuthenticated) {
            try {
                await apiFetch('/me/match/', {
                    method: 'POST',
                    body: JSON.stringify({
                        is_victory: isVictory,
                        score_player: score1,
                        score_opponent: score2,
                        opponent_name: opponentName,
                        duration_seconds: durationSeconds,
                    }),
                });
            } catch (err) {
                console.warn('[userStore] Sauvegarde match API échouée', err);
            }
        }
    },

    /** Déconnexion propre : invalide session Django + vide localStorage */
    async logout() {
        if (this._isAuthenticated) {
            try {
                await apiFetch('/logout/', { method: 'POST' });
            } catch {}
        }
        const keysToReset = ['pong_wins','pong_losses','pong_total_seconds','user_xp','match_history','global_chat_history'];
        const keysToRemove = ['user_name', 'user_avatar', 'user_data', 'is_staff'];

        keysToReset.forEach(k => localStorage.setItem(k, k.includes('history') ? '[]' : '0'));
        keysToRemove.forEach(k => localStorage.removeItem(k));
        this._cache = {};
        this._isAuthenticated = false;
        localStorage.setItem('is_staff', 'false');
        window.location.href = '/';
    },

    isLoggedIn() {
        return this._isAuthenticated;
    },

    _syncToLocalStorage() {
        Object.entries(this._cache).forEach(([k, v]) => {
            if (k === 'user_avatar') return; // ne cache jamais l'avatar en localStorage
            if (v !== null && v !== undefined) localStorage.setItem(k, v);
        });
    },

    _loadFromLocalStorage() {
        Object.keys(LS_KEYS).forEach(k => {
            const v = localStorage.getItem(k);
            if (v !== null) this._cache[k] = v;
        });
    },
};