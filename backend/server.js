require('dotenv').config();
console.log("SECRET chargé :", process.env.FORTYTWO_CLIENT_SECRET ? "✅ OK" : "❌ undefined");
const express = require('express');
const axios   = require('axios');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());

// Configuration OAuth 42
const UID          = 'u-s4t2ud-ca92bf4d5bd6937ac2295ecb335d4eb51dc7a9a1e0d5554f8555fdc4c7c2c597';
const SECRET       = process.env.FORTYTWO_CLIENT_SECRET;
const REDIRECT_URI = 'https://localhost:8443/accounts/fortytwo/login/callback/';

// URL interne Django (dans le même réseau Docker)
const DJANGO_INTERNAL = 'http://backend:8000';

app.get('/accounts/fortytwo/login/callback/', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        console.error("❌ Aucun code d'autorisation reçu");
        return res.status(400).send("Erreur : Pas de code reçu de 42.");
    }

    try {
        console.log("🔄 Échange du code contre un token...");

        const params = new URLSearchParams();
        params.append('grant_type',    'authorization_code');
        params.append('client_id',     UID);
        params.append('client_secret', SECRET);
        params.append('code',          code);
        params.append('redirect_uri',  REDIRECT_URI);

        const tokenResponse = await axios.post('https://api.intra.42.fr/oauth/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const accessToken = tokenResponse.data.access_token;

        console.log("✅ Token obtenu, récupération du profil utilisateur...");

        const userResponse = await axios.get('https://api.intra.42.fr/v2/me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const login  = userResponse.data.login;
        const avatar = userResponse.data.image?.link || '';

        console.log(`🚀 Succès ! Connecté en tant que : ${login}`);

        // ── Notifier Django pour créer/mettre à jour le user en DB ───────────
        try {
            await axios.post(`${DJANGO_INTERNAL}/api/users/oauth-login/`, {
                username: login,
                avatar:   avatar,
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            console.log("✅ User synchronisé avec Django DB");
        } catch (djangoErr) {
            console.warn("⚠️ Sync Django échouée (non bloquant) :", djangoErr.message);
        }

        // Redirection vers le frontend avec les infos user
        res.redirect(`https://localhost:8443/?login=${login}&avatar=${encodeURIComponent(avatar)}`);

    } catch (error) {
        const errorData = error.response ? error.response.data : error.message;
        console.error("❌ Erreur API 42:", errorData);
        res.status(500).json({
            message: "Erreur d'authentification",
            details: errorData
        });
    }
});

app.listen(3000, '0.0.0.0', () => {
    console.log('🚀 Backend 42 opérationnel');
    console.log(`📡 Callback attendu : ${REDIRECT_URI}`);
});

