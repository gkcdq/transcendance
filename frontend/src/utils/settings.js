import { userStore, getCsrfToken } from './userStore.js';
await userStore.init();
import { navigateTo } from '../main.js';

export function initSettings() {
    const form = document.getElementById('settings-form');
    const msg  = document.getElementById('settings-msg');
    document.getElementById('username-input').value = userStore.get('user_name', 'Player');
    document.getElementById('paddle-color').value   = userStore.get('user_color', '#00babc');
    document.getElementById('ai-difficulty').value  = userStore.get('ai_level', '5');
    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        await userStore.set('user_color', document.getElementById('paddle-color').value);
        await userStore.set('ai_level',   document.getElementById('ai-difficulty').value);
        msg.innerHTML = '<p style="color:#2ea043;margin-top:15px;">Préférences mises à jour !</p>';
    };
    // suppression du compte (rgpd)
    const btnDelete = document.getElementById('btn-delete-account');
    if (btnDelete) btnDelete.onclick = async () => {
        const confirm1 = confirm('⚠️ Supprimer ton compte ? Cette action est irréversible.');
        if (!confirm1) return;
        const res = await fetch('/api/users/delete/', {
            method: 'POST', credentials: 'include',
            headers: { 'X-CSRFToken': getCsrfToken() }
        });
        if (res.ok) {
            localStorage.clear();
            sessionStorage.clear();
            await userStore.logout();
            navigateTo('/');
        }
    };
    const btnReset = document.getElementById('btn-reset-settings');
    if (btnReset) btnReset.onclick = async () => {
        await userStore.set('user_color', '#00babc');
        await userStore.set('ai_level',   '5');
        document.getElementById('paddle-color').value  = '#00babc';
        document.getElementById('ai-difficulty').value = '5';
        msg.innerHTML = '<p style="color:#8b949e;margin-top:15px;">Paramètres réinitialisés par défaut.</p>';
    };
    const btnAvatar   = document.getElementById('btn-upload-avatar');
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        avatarInput.onchange = () => {
            const file = avatarInput.files[0];
            if (!file) return;
            const preview = document.getElementById('avatar-preview');
            if (preview) preview.innerHTML = `<img src="${URL.createObjectURL(file)}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #00babc;">`;
        };
    }
    if (btnAvatar) btnAvatar.onclick = async () => {
        const file = avatarInput.files[0];
        if (!file) { alert('Sélectionne une image.'); return; }
        if (file.size > 2 * 1024 * 1024) { alert('Fichier trop lourd (2MB max)'); return; }
        if (!file.type.startsWith('image/')) { alert('Format invalide'); return; }
        const formData = new FormData();
        formData.append('avatar', file);
        try {
            const res = await fetch('/api/users/upload-avatar/', {
                method: 'POST', credentials: 'include',
                headers: { 'X-CSRFToken': getCsrfToken() },
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                //await userStore.set('user_avatar', data.avatar);
                await userStore.init();
                msg.innerHTML = '<p style="color:#2ea043;margin-top:15px;">Avatar mis à jour !</p>';
            } else {
                alert(data.error);
            }
        } catch (e) { alert('Erreur réseau.'); }
    };
    const btnEmail = document.getElementById('btn-update-email');
    if (btnEmail) btnEmail.onclick = async () => {
        const email = document.getElementById('email-input').value.trim();
        if (!email) { alert('Entre un email.'); return; }
        try {
            const res = await fetch('/api/users/me/update/', {
                method: 'PATCH', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: JSON.stringify({ email }),
            });
            if (res.ok) msg.innerHTML = '<p style="color:#2ea043;margin-top:15px;">Email mis à jour !</p>';
            else {
                const data = await res.json();
                alert(data.error || 'Erreur.');
            }
        } catch (e) { alert('Erreur réseau.'); }
    };

    const btnPassword = document.getElementById('btn-update-password');
    if (btnPassword) btnPassword.onclick = async () => {
        const oldPwd  = document.getElementById('old-password').value;
        const newPwd  = document.getElementById('new-password').value;
        const confirm = document.getElementById('confirm-password').value;
        if (!oldPwd || !newPwd) { alert('Remplis tous les champs.'); return; }
        if (newPwd !== confirm)  { alert('Les mots de passe ne correspondent pas.'); return; }
        if (newPwd.length < 8)   { alert('Mot de passe trop court (8 caractères min).'); return; }
        try {
            const res = await fetch('/api/users/me/password/', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: JSON.stringify({ old_password: oldPwd, new_password: newPwd }),
            });
            const data = await res.json();
            if (res.ok) {
                msg.innerHTML = '<p style="color:#2ea043;margin-top:15px;">Mot de passe mis à jour !</p>';
                document.getElementById('old-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
            } else {
                alert(data.error || 'Erreur.');
            }
        } catch (e) { alert('Erreur réseau.'); }
    };
}