// Admin functionality - consolidated from admin.js and admin functions from index.html
(function(){
    const perf = window.perf;

    // === ADMIN API FUNCTIONS ===
    async function approveUser(userId) {
        return window.Api.fetch('/admin/approve-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId })
        });
    }

    async function toggleAdmin(userId, isAdmin) {
        return window.Api.fetch('/admin/toggle-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId, isAdmin: !!isAdmin })
        });
    }

    async function deleteUser(userId) {
        return window.Api.fetch('/users/' + userId, { method: 'DELETE' });
    }

    async function deleteMessage(messageId) {
        return window.Api.fetch('/messages/' + messageId, { method: 'DELETE' });
    }

    async function loadPendingUsers() {
        return window.Api.fetch('/users/pending');
    }

    // === ADMIN UI FUNCTIONS ===
    async function showPendingUsers() {
        try {
            perf.log(`📋 Loading pending users...`);
            
            const pendingUsers = await loadPendingUsers();
            
            if (pendingUsers.length === 0) {
                alert('Nėra nepatvirtintų vartotojų.');
                return;
            }
            
            let message = 'Nepatvirtinti vartotojai:\n\n';
            pendingUsers.forEach(user => {
                const date = new Date(user.created_at).toLocaleString('lt-LT');
                message += `👤 ${user.username}\n📅 Registracija: ${date}\n\n`;
            });
            
            message += 'Patvirtinti vartotoją galite per serverio administravimo panelį.';
            alert(message);
        } catch (error) {
            perf.log(`❌ Error loading pending users:`, error);
            alert('Klaida gaunant nepatvirtintus vartotojus.');
        }
    }

    function showAdminLog() {
        const state = window.state || {};
        if (!state.currentUser?.isAdmin) return;
        
        const modal = document.getElementById('logs-modal');
        const body = document.getElementById('logs-modal-body');
        if (modal && body) {
            body.textContent = (window.__logBuffer || []).join('\n');
            modal.style.display = 'flex';
            setTimeout(() => { body.scrollTop = body.scrollHeight; }, 50);
        }
    }

    // === EXPORT ===
    window.AdminService = {
        approveUser: approveUser,
        toggleAdmin: toggleAdmin,
        deleteUser: deleteUser,
        deleteMessage: deleteMessage,
        loadPendingUsers: loadPendingUsers,
        showPendingUsers: showPendingUsers,
        showAdminLog: showAdminLog
    };
})();
