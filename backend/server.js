const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Configuration OAuth 42
const UID = 'u-s4t2ud-32403f139f0bc0256990e7a5cc583e40d672918477978b43a7a03e3d93804de7';
const SECRET = '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';
const REDIRECT_URI = 'https://localhost:8443/accounts/fortytwo/login/callback/';

app.get('/accounts/fortytwo/login/callback/', async (req, res) => {
    const code = req.query.code;
    
    if (!code) {
        console.error("❌ Aucun code d'autorisation reçu");
        return res.status(400).send("Erreur : Pas de code reçu de 42.");
    }

    try {
        console.log("🔄 Échange du code contre un token...");
        
        // Utilisation de URLSearchParams pour l'encodage correct des données POST
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', UID);
        params.append('client_secret', SECRET);
        params.append('code', code);
        params.append('redirect_uri', REDIRECT_URI);

        const tokenResponse = await axios.post('https://api.intra.42.fr/oauth/token', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const accessToken = tokenResponse.data.access_token;

        console.log("✅ Token obtenu, récupération du profil utilisateur...");

        const userResponse = await axios.get('https://api.intra.42.fr/v2/me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const login = userResponse.data.login;
        const avatar = userResponse.data.image?.link || '';

        console.log(`🚀 Succès ! Connecté en tant que : ${login}`);
        res.redirect(`https://localhost:8443/?login=${login}&avatar=${avatar}`);
    } catch (error) {
        const errorData = error.response ? error.response.data : error.message;
        console.error("❌ Erreur API 42:", errorData);
        
        res.status(500).json({
            message: "Erreur d'authentification",
            details: errorData
        });
    }
});

// Le serveur écoute sur le port 3000 à l'intérieur du conteneur
app.listen(3000, '0.0.0.0', () => {
    console.log('🚀 Backend 42 opérationnel');
    console.log(`📡 Callback attendu : ${REDIRECT_URI}`);
});

