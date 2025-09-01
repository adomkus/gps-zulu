// Modal components - consolidated from context-menu.js, user-detail.js, and admin modals
(function(){
    const perf = window.perf;
    const CoreUtils = window.CoreUtils;

    // === CONTEXT MENU ===
    function showContextMenu(user) {
        const el = window.el || {};
        const state = window.state || {};
        
        state.activeContextUser = user;
        if (el.contextMenuTitle) el.contextMenuTitle.textContent = user.username;
        if (el.contextMenuActions) el.contextMenuActions.innerHTML = '';
        
        const isOnline = state.onlineUsers.has(user.id);
        
        if (el.contextMenuActions) {
            el.contextMenuActions.innerHTML += '<button data-action="chat">💬 Rašyti žinutę</button>';
            if (isOnline && state.onlineUsers.get(user.id) && state.onlineUsers.get(user.id).lat) {
                el.contextMenuActions.innerHTML += '<button data-action="show-on-map">📍 Rodyti žemėlapyje</button>';
            } else {
                el.contextMenuActions.innerHTML += '<button data-action="show-on-map">📍 Rodyti žemėlapyje</button>';
            }
            el.contextMenuActions.innerHTML += '<button data-action="follow">🎯 Sekti</button>';
            el.contextMenuActions.innerHTML += '<button data-action="info">ℹ️ Informacija</button>';
            if (state.currentUser && state.currentUser.isAdmin) {
                if (!user.is_approved) {
                    el.contextMenuActions.innerHTML += '<button data-action="approve">✅ Patvirtinti vartotoją</button>';
                }
                el.contextMenuActions.innerHTML += '<button data-action="toggle-admin">' + 
                    ((user.is_admin || user.isAdmin) ? '⬇️ Atimti admin teises' : '⬆️ Suteikti admin teises') + '</button>';
            }
        }
        
        if (el.contextMenuOverlay) el.contextMenuOverlay.classList.remove('hidden');
    }

    // Parodyti meniu nurodytoje ekrano vietoje (šalia markerio)
    function showContextMenuAt(user, point) {
        const el = window.el || {};
        showContextMenu(user);
        try {
            const wrapper = window.el && window.el.contextMenuWrapper ? window.el.contextMenuWrapper : document.getElementById('context-menu-wrapper');
            if (wrapper && point) {
                wrapper.style.position = 'absolute';
                wrapper.style.left = Math.max(8, Math.min(window.innerWidth - 220, point.x + 12)) + 'px';
                wrapper.style.top = Math.max(8, Math.min(window.innerHeight - 220, point.y + 12)) + 'px';
            }
            if (el.contextMenuOverlay) {
                el.contextMenuOverlay.style.background = 'transparent';
            }
        } catch(_) {}
    }

    function hideContextMenu() {
        const el = window.el || {};
        const state = window.state || {};
        
        if (el.contextMenuOverlay) el.contextMenuOverlay.classList.add('hidden');
        state.activeContextUser = null;
    }

    async function handleContextMenuAction(e) {
        const el = window.el || {};
        const state = window.state || {};
        
        const action = e.target.dataset.action;
        if (e.target.closest('[data-action="cancel"]') || e.target === el.contextMenuOverlay) {
            return hideContextMenu();
        }
        if (!action || !state.activeContextUser) return;
        
        const userId = state.activeContextUser.id || state.activeContextUser.userId;
        let needsUpdate = false;
        
        switch(action) {
            case 'chat':
                if (window.socket) window.socket.emit('initiate private chat', userId);
                break;
            case 'show-on-map':
                if (window.UIModule) window.UIModule.switchView('map-view');
                const loc = state.onlineUsers.get(userId);
                if (loc && loc.lat && loc.lon && window.MapModule) {
                    const m = window.MapModule.getMap && window.MapModule.getMap();
                    if (m) m.setView([loc.lat, loc.lon], 15);
                }
                break;
            case 'info':
                if (window.UserDetailUI) window.UserDetailUI.show(state.activeContextUser);
                break;
            case 'follow':
                if (window.FollowingService) window.FollowingService.start(userId);
                break;
            case 'approve':
                if (window.AdminService) await window.AdminService.approveUser(userId);
                needsUpdate = true;
                break;
            case 'toggle-admin':
                if (window.AdminService) await window.AdminService.toggleAdmin(userId, !state.activeContextUser.is_admin);
                needsUpdate = true;
                break;
        }
        
        hideContextMenu();
        
        if (needsUpdate) {
            const data = await window.Api.fetch('/initial-data');
            state.allUsers = new Map(data.allUsers.map(u => [u.id, u]));
            if (window.UIModule) window.UIModule.renderUsers(data.onlineUsers || []);
        }
    }

    // === USER DETAIL MODAL ===
    function showUserDetailModal(user) {
        const el = window.el || {};
        const state = window.state || {};
        
        window.currentUserDetail = user;
        const isOnline = state.onlineUsers.has(user.id || user.userId);
        const location = state.onlineUsers.get(user.id || user.userId);
        
        if (el.userDetailName) el.userDetailName.textContent = user.username;
        if (el.userDetailRole) el.userDetailRole.textContent = user.is_admin ? '👑 Administratorius' : '👤 Vartotojas';
        
        let infoHTML = '';
        
        // Status info
        infoHTML += `
            <div class="user-detail-item">
                <label>Būsena:</label>
                <span>${isOnline ? 'Prisijungęs' : 'Neprisijungęs'}</span>
            </div>
        `;
        
                    // Location info
            if (isOnline && location && location.lat && location.lon) {
                const lastUpdate = location.lastLocationUpdate ? 
                    CoreUtils.formatDateTime(location.lastLocationUpdate) : 'Nežinoma';
                    
                let locationDetails = `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`;
                
                if (location.locationAccuracy) {
                    locationDetails += ` (Tikslumas: ±${Math.round(location.locationAccuracy)}m)`;
                }
                
                if (location.speed !== undefined && location.speed !== null && location.speed > 0) {
                    locationDetails += ` (Greitis: ${Math.round(location.speed * 3.6)} km/h)`;
                }
                
                locationDetails += ` (Atnaujinta: ${lastUpdate})`;
                    
                infoHTML += `
                    <div class="user-detail-item">
                        <label>Vietovė:</label>
                        <span>${locationDetails}</span>
                    </div>
                `;
                
                // Distance moved info for admins
                if (state.currentUser && state.currentUser.isAdmin && location.distanceMoved !== undefined) {
                    const distance = location.distanceMoved;
                    const distanceText = distance < 1 ? 
                        `${Math.round(distance * 1000)}m` : 
                        `${distance.toFixed(2)}km`;
                        
                    infoHTML += `
                        <div class="user-detail-item">
                            <label>Paskutinis judėjimas:</label>
                            <span>${distanceText}</span>
                        </div>
                    `;
                }
            }
        
        // Connection time
        if (isOnline && location && location.connectedAt) {
            const connectedTime = CoreUtils.formatDateTime(location.connectedAt);
            infoHTML += `
                <div class="user-detail-item">
                    <label>Prisijungė:</label>
                    <span>${connectedTime}</span>
                </div>
            `;
        }
        
        // User ID for admins
        if (state.currentUser && state.currentUser.isAdmin) {
            infoHTML += `
                <div class="user-detail-item">
                    <label>Vartotojo ID:</label>
                    <span>${user.id || user.userId}</span>
                </div>
            `;
        }
        
        // Account status for admins
        if (state.currentUser && state.currentUser.isAdmin && (user.is_approved !== undefined)) {
            infoHTML += `
                <div class="user-detail-item">
                    <label>Paskyros statusas:</label>
                    <span>${user.is_approved ? 'Patvirtinta' : 'Laukia patvirtinimo'}</span>
                </div>
            `;
        }
        
        if (el.userDetailBody) el.userDetailBody.innerHTML = infoHTML;
        
        if (el.userDetailModal) el.userDetailModal.classList.remove('hidden');
    }

    function hideUserDetailModal() {
        const el = window.el || {};
        if (el.userDetailModal) el.userDetailModal.classList.add('hidden');
    }

    // === ADMIN LOGS MODAL ===
    function showAdminLog() {
        const state = window.state || {};
        if (!state.currentUser?.isAdmin) return;
        
        const modal = window.el && window.el.logsModal ? window.el.logsModal : document.getElementById('logs-modal');
        const body = window.el && window.el.logsModalBody ? window.el.logsModalBody : document.getElementById('logs-modal-body');
        if (modal && body) {
            body.textContent = (window.__logBuffer || []).join('\n');
            modal.style.display = 'flex';
            setTimeout(() => { body.scrollTop = body.scrollHeight; }, 50);
        }
    }

    // === EXPORT ===
    window.ContextMenuUI = {
        show: showContextMenu,
        showAt: showContextMenuAt,
        hide: hideContextMenu
    };
    
    window.UserDetailUI = {
        show: showUserDetailModal,
        hide: hideUserDetailModal
    };
    
    window.AdminModals = {
        showLog: showAdminLog
    };
})();
