const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());

const UID = 'u-s4t2ud-32403f139f0bc0256990e7a5cc583e40d672918477978b43a7a03e3d93804de7';
const SECRET = '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';

// ATTENTION : Cette URL doit être IDENTIQUE à celle bloquée sur ton Intra.
// Si sur l'Intra il n'y a pas de / à la fin, enlève-le ici aussi.
const REDIRECT_URI = 'https://localhost:8443/accounts/fortytwo/login/callback/';

app.get('/auth/42/callback', async (req, res) => {
    const code = req.query.code;
    
    if (!code) {
        return res.status(400).send("Pas de code reçu");
    }

    try {
        // Échange du code contre un Access Token
        const response = await axios.post('https://api.intra.42.fr/oauth/token', {
            grant_type: 'authorization_code',
            client_id: UID,
            client_secret: SECRET,
            code: code,
            redirect_uri: REDIRECT_URI // C'est ici que 42 vérifie la concordance
        });

        const accessToken = response.data.access_token;

        // Récupération des infos de l'étudiant
        const userResponse = await axios.get('https://api.intra.42.fr/v2/me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        console.log("🚀 Succès ! Connecté en tant que :", userResponse.data.login);

        // Redirection vers ton frontend avec les infos en paramètres
        const login = userResponse.data.login;
        const avatar = userResponse.data.image.link;
        res.redirect(`https://localhost:8443/?login=${login}&avatar=${avatar}`);
        
    } catch (error) {
        console.error("❌ Erreur API 42:", error.response ? error.response.data : error.message);
        res.status(500).send("Erreur d'authentification : vérifie la console du serveur.");
    }
});

app.listen(3000, () => console.log('🚀 Backend 42 prêt sur http://localhost:3000'));

