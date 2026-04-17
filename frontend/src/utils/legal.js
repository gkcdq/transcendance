
export const legalPageHTML = `
<canvas id="pong-canvas-bg"></canvas>
<div class="legal-page" style="
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px 80px;
    position: relative;
    z-index: 1;
    color: #c9d1d9;
    font-family: inherit;
">

    <!-- Onglets -->
    <div style="display:flex; gap:0; border-bottom: 1px solid #30363d; margin-bottom: 36px;">
        <button id="tab-privacy-btn" onclick="switchLegalTab('privacy')" style="
            padding: 10px 28px; background: none; border: none;
            border-bottom: 2px solid #00babc; color: #00babc;
            font-size: 0.9rem; font-weight: 700; cursor: pointer;
            margin-bottom: -1px; letter-spacing: 0.5px;
        ">Confidentialité</button>
        <button id="tab-terms-btn" onclick="switchLegalTab('terms')" style="
            padding: 10px 28px; background: none; border: none;
            border-bottom: 2px solid transparent; color: #8b949e;
            font-size: 0.9rem; cursor: pointer; margin-bottom: -1px;
            letter-spacing: 0.5px;
        ">Conditions d'utilisation</button>
    </div>

    <!-- ========== PRIVACY POLICY ========== -->
    <div id="tab-privacy">

        <div style="margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #21262d;">
            <h1 style="font-size: 1.4rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; color: #e6edf3;">
                Politique de confidentialité
            </h1>
            <p style="color: #8b949e; font-size: 0.8rem;">
                Dernière mise à jour : avril 2026 &nbsp;·&nbsp; Transcendence - Projet 42 Paris
            </p>
        </div>

        <div style="background: rgba(0,186,188,0.05); border: 1px solid rgba(0,186,188,0.2);
                    border-radius: 8px; padding: 16px 20px; margin-bottom: 32px;
                    font-size: 0.85rem; line-height: 1.7; color: #8b949e;">
            Ce projet est réalisé dans le cadre pédagogique de l'école 42 Paris.
            Aucune donnée personnelle n'est collectée à des fins commerciales.
            Cette politique explique de manière transparente quelles informations sont utilisées et pourquoi.
        </div>

        ${privacySection('1. Données collectées',
            `<p>Lors de l'utilisation de la plateforme, les données suivantes peuvent être traitées :</p>
            <ul>
                <li>Nom d'utilisateur et identifiant choisis à l'inscription</li>
                <li>Adresse e-mail, utilisée uniquement pour l'authentification</li>
                <li>Statistiques de jeu (scores, résultats de parties, classement)</li>
                <li>Données de connexion (horodatage, statut en ligne)</li>
                <li>Avatar ou photo de profil si téléchargée volontairement</li>
            </ul>`
        )}

        ${privacySection('2. Finalités du traitement',
            `<p>Ces données sont collectées dans les seuls buts suivants :</p>
            <ul>
                <li>Permettre la création et la gestion d'un compte utilisateur</li>
                <li>Assurer le fonctionnement du jeu en ligne (matchmaking, scores)</li>
                <li>Afficher un tableau des scores et un historique de parties</li>
                <li>Gérer les fonctionnalités sociales (liste d'amis, chat)</li>
            </ul>`
        )}

        ${privacySection('3. Conservation des données',
            `<p>Les données sont conservées uniquement pour la durée nécessaire au fonctionnement du projet.
            Aucune donnée n'est transmise à des tiers, vendue ou exploitée commercialement.
            Elles peuvent être supprimées sur simple demande via la page Paramètres.</p>`
        )}

        ${privacySection('4. Authentification OAuth (42 Intra)',
            `<p>Si vous utilisez la connexion via le portail 42 (OAuth2), les informations transmises
            par 42 (login, e-mail, nom) sont utilisées uniquement pour créer ou identifier votre compte.
            Aucune donnée supplémentaire n'est stockée depuis le fournisseur OAuth.</p>`
        )}

        ${privacySection('5. Cookies et sessions',
            `<p>La plateforme utilise des cookies de session strictement nécessaires au maintien de votre connexion.
            Aucun cookie de traçage publicitaire ou analytique tiers n'est utilisé.</p>`
        )}

        ${privacySection('6. Vos droits (RGPD)',
            `<p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
            <ul>
                <li>Droit d'accès à vos données personnelles</li>
                <li>Droit de rectification en cas d'inexactitude</li>
                <li>Droit à l'effacement ("droit à l'oubli") disponible depuis la page <strong style="color:#00babc;">Paramètres → Supprimer mon compte</strong></li>
                <li>Droit d'opposition au traitement</li>
            </ul>`
        )}
    </div>

    <!-- ========== TERMS OF SERVICE ========== -->
    <div id="tab-terms" style="display:none;">

        <div style="margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #21262d;">
            <h1 style="font-size: 1.4rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; color: #e6edf3;">
                Conditions d'utilisation
            </h1>
            <p style="color: #8b949e; font-size: 0.8rem;">
                Dernière mise à jour : avril 2026 &nbsp;·&nbsp; Transcendence - Projet 42 Paris
            </p>
        </div>

        <div style="background: rgba(0,186,188,0.05); border: 1px solid rgba(0,186,188,0.2);
                    border-radius: 8px; padding: 16px 20px; margin-bottom: 32px;
                    font-size: 0.85rem; line-height: 1.7; color: #8b949e;">
            En accédant à cette plateforme, vous acceptez les présentes conditions.
            Ce projet est développé à des fins éducatives dans le cadre du cursus de l'école 42 Paris
            et ne constitue pas un service commercial.
        </div>

        ${privacySection('1. Objet',
            `<p>Transcendence est une application web de jeu en ligne (Pong multijoueur) développée
            dans le cadre du projet final du cursus commun de l'école 42 Paris.
            L'accès est libre et gratuit, à titre de démonstration technique et pédagogique.</p>`
        )}

        ${privacySection('2. Création de compte',
            `<p>Pour accéder aux fonctionnalités de la plateforme, vous devez créer un compte ou vous
            connecter via OAuth (portail 42). Vous êtes responsable de la confidentialité de vos
            identifiants et des actions effectuées depuis votre compte.</p>
            <p>Vous vous engagez à fournir des informations exactes lors de l'inscription et à ne pas
            usurper l'identité d'un tiers.</p>`
        )}

        ${privacySection('3. Règles de conduite',
            `<p>En utilisant la plateforme, vous vous engagez à :</p>
            <ul>
                <li>Ne pas utiliser de langage offensant, haineux ou discriminatoire dans le chat</li>
                <li>Ne pas tenter d'exploiter des failles techniques ou de tricher dans les parties</li>
                <li>Ne pas tenter d'accéder aux comptes ou données d'autres utilisateurs</li>
                <li>Ne pas perturber volontairement le fonctionnement de la plateforme</li>
                <li>Respecter les autres joueurs et maintenir un environnement sain</li>
            </ul>`
        )}

        ${privacySection('4. Disponibilité du service',
            `<p>Ce projet étant à vocation pédagogique, aucune garantie de disponibilité permanente
            ou de continuité de service n'est donnée. La plateforme peut être interrompue, modifiée
            ou mise hors ligne à tout moment sans préavis.</p>`
        )}

        ${privacySection('5. Propriété intellectuelle',
            `<p>Le code source de ce projet est développé par les étudiants dans le cadre de 42 Paris.
            Le contenu textuel et graphique est produit à des fins éducatives. Toute réutilisation
            commerciale est interdite sans accord explicite des auteurs.</p>`
        )}

        ${privacySection('6. Limitation de responsabilité',
            `<p>Les développeurs de ce projet déclinent toute responsabilité en cas de perte de données,
            d'interruption de service ou de dommages indirects liés à l'utilisation de la plateforme.
            Ce service est fourni "en l'état", sans garantie d'aucune sorte.</p>`
        )}

        ${privacySection('7. Modification des conditions',
            `<p>Ces conditions peuvent être modifiées à tout moment. Les utilisateurs seront informés
            des changements importants. La date de dernière mise à jour est indiquée en haut de ce document.</p>`
        )}

        ${privacySection('8. Droit applicable',
            `<p>Ces conditions sont soumises au droit français. En cas de litige, et à défaut de
            résolution amiable, les tribunaux compétents seront ceux du ressort de Paris, France.</p>`
        )}

        
    </div>

</div>
`;

// Helper interne (utilisé uniquement lors du build du template)
function privacySection(title, content) {
    return `
    <div style="margin-bottom: 28px;">
        <h3 style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
                   letter-spacing: 0.1em; color: #8b949e; margin-bottom: 12px;
                   border-left: 3px solid #00babc; padding-left: 10px;">
            ${title}
        </h3>
        <div style="font-size: 0.87rem; line-height: 1.8; color: #c9d1d9;">
            ${content}
        </div>
        <ul style="color: #c9d1d9; font-size: 0.87rem; line-height: 1.8;
                   padding-left: 1.4rem; margin-top: 8px;"></ul>
    </div>
    <div style="height: 1px; background: #21262d; margin-bottom: 28px;"></div>
    `;
}

// Fonction globale pour switcher les onglets (appelée depuis le HTML inline)
export function initLegal() {
    window.switchLegalTab = (tab) => {
        const privacy     = document.getElementById('tab-privacy');
        const terms       = document.getElementById('tab-terms');
        const btnPrivacy  = document.getElementById('tab-privacy-btn');
        const btnTerms    = document.getElementById('tab-terms-btn');

        if (tab === 'privacy') {
            privacy.style.display = 'block';
            terms.style.display   = 'none';
            btnPrivacy.style.borderBottomColor = '#00babc';
            btnPrivacy.style.color             = '#00babc';
            btnPrivacy.style.fontWeight        = '700';
            btnTerms.style.borderBottomColor   = 'transparent';
            btnTerms.style.color               = '#8b949e';
            btnTerms.style.fontWeight          = '400';
        } else {
            terms.style.display   = 'block';
            privacy.style.display = 'none';
            btnTerms.style.borderBottomColor   = '#00babc';
            btnTerms.style.color               = '#00babc';
            btnTerms.style.fontWeight          = '700';
            btnPrivacy.style.borderBottomColor = 'transparent';
            btnPrivacy.style.color             = '#8b949e';
            btnPrivacy.style.fontWeight        = '400';
        }
    };
}
