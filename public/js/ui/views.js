// Main UI views - consolidated from ui.js and parts of index.html
(function(){
    const perf = window.perf;
    const CoreUtils = window.CoreUtils;

    // === VIEW MANAGEMENT ===
    function switchView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        
        const el = window.el || {};
        el.showMapBtn.classList.remove('active');
        el.showListBtn.classList.remove('active');
        
        if (viewId.includes('map')) {
            el.showMapBtn.classList.add('active');
            setTimeout(() => {
                if (window.MapModule && window.MapModule.getMap) {
                    const map = window.MapModule.getMap();
                    map.invalidateSize();
                    if (window.MapModule.renderMapMarkers) window.MapModule.renderMapMarkers();
                    if (window.MapModule.updateMapBounds) window.MapModule.updateMapBounds();
                }
            }, 100);
        } else if (viewId.includes('list')) {
            el.showListBtn.classList.add('active');
        }
    }

    // === USERS LIST RENDERING ===
    function renderUsers(onlineUsersList) {
        perf.log(`🔄 Rendering users: ${onlineUsersList.length} online users`);
        
        const state = window.state || {};
        const el = window.el || {};
        
        // Optimize onlineUsers as Map
        state.onlineUsers = new Map(onlineUsersList.map(u => [u.userId, u]));
        
        const fragment = document.createDocumentFragment();
        el.usersList.innerHTML = '';
        
        // Safely use allUsers - if not exists, use onlineUsersList
        const usersToRender = (state.currentUser && state.currentUser.isAdmin && state.allUsers && state.allUsers.size)
            ? Array.from(state.allUsers.values())
            : (onlineUsersList || []);
        const otherUsers = usersToRender.filter(user => 
            (user.id || user.userId) !== state.currentUser.id
        );
        
        perf.log(`👥 Rendering ${otherUsers.length} other users (admin: ${state.currentUser.isAdmin}, allUsers: ${state.allUsers ? state.allUsers.size : 0})`);
        
        if (otherUsers.length === 0) {
            const placeholder = document.createElement('li');
            placeholder.className = 'placeholder';
            placeholder.textContent = state.currentUser.isAdmin ? 
                'Nėra kitų vartotojų sistemoje.' : 
                'Nėra prisijungusių vartotojų.';
            fragment.appendChild(placeholder);
        } else {
            otherUsers.forEach(user => {
                const userId = user.id || user.userId;
                const li = document.createElement('li');
                li.className = 'user-item';
                li.dataset.userId = userId;
                
                const isOnline = state.onlineUsers.has(userId);
                const userData = state.allUsers.get(userId) || user;
                
                li.innerHTML = `
                    <div class="status-indicator ${isOnline ? 'online' : ''}"></div>
                    <div class="username">${userData.username}</div>
                    ${(userData.is_admin || userData.isAdmin) ? '<span class="admin-badge">Admin</span>' : ''}
                `;
                fragment.appendChild(li);
            });
        }
        
        el.usersList.appendChild(fragment);
        if (window.MapModule && window.MapModule.renderMapMarkers) {
            window.MapModule.renderMapMarkers();
        }
    }

    // === MAP POPUP ACTIONS ===
    function handleMapPopupAction(action, userId) {
        perf.log(`🎯 handleMapPopupAction called: action=${action}, userId=${userId}`);
        
        const state = window.state || {};
        let user = null;
        
        // First search in onlineUsers
        user = Array.from(state.onlineUsers.values()).find(u => u.userId === userId);
        
        // If not found, search in allUsers (if exists)
        if (!user && state.allUsers) {
            user = Array.from(state.allUsers.values()).find(u => u.id === userId || u.userId === userId);
        }
        
        if (!user) {
            perf.log(`❌ User not found for action: ${action}, userId: ${userId}`);
            alert(`Klaida: Vartotojas nerastas (ID: ${userId})`);
            return;
        }
        
        perf.log(`✅ User found: ${user.username}, proceeding with action: ${action}`);
        
        if (window.MapModule && window.MapModule.getMap) {
            window.MapModule.getMap().closePopup();
        }
        
        switch(action) {
            case 'chat':
                perf.log(`🚀 Starting chat with user: ${user.username} (ID: ${userId})`);
                
                if (!userId || isNaN(userId)) {
                    perf.log(`❌ Invalid userId: ${userId}`);
                    alert('Klaida: neteisingas vartotojo ID');
                    return;
                }
                
                if (window.socket && window.socket.connected) {
                    perf.log(`📡 Socket connected (${window.socket.id}), emitting 'initiate private chat' for user ${userId}`);
                    
                    if (window.MessagesModule && window.MessagesModule.addSystemMessage) {
                        window.MessagesModule.addSystemMessage(`🚀 Kreipiamės į serverį dėl pokalbio su ${user.username}...`);
                    }
                    
                    window.socket.emit('initiate private chat', userId);
                    
                    const chatTimeout = setTimeout(() => {
                        perf.log(`⏰ Chat initiation timeout for user ${userId}`);
                        if (window.MessagesModule && window.MessagesModule.addSystemMessage) {
                            window.MessagesModule.addSystemMessage(`⏰ Serveris per ilgai neatsako. Bandykite dar kartą.`);
                        }
                        
                        if (window.socket && !window.socket.connected) {
                            perf.log(`🔄 Attempting socket reconnection...`);
                            window.socket.connect();
                        }
                    }, 15000);
                    
                    window.lastChatTimeout = chatTimeout;
                    perf.log(`📤 Socket event sent, waiting for 'private chat started' response...`);
                } else {
                    perf.log(`❌ Socket not connected`);
                    alert('Nėra ryšio su serveriu. Bandykite perkrauti puslapį.');
                    
                    if (window.socket) {
                        perf.log(`🔄 Attempting to reconnect socket...`);
                        window.socket.connect();
                    }
                }
                break;
                
            case 'center':
                const location = state.onlineUsers.get(userId);
                if (location?.lat && location?.lon && window.MapModule && window.MapModule.getMap) {
                    const map = window.MapModule.getMap();
                    map.setView([location.lat, location.lon], 18, {
                        animate: true,
                        duration: 1.5
                    });
                    perf.log(`Centered map on user: ${user.username} with max zoom`);
                    
                    const marker = window.userMarkers && window.userMarkers.get(userId);
                    if (marker) {
                        setTimeout(() => {
                            marker.openPopup();
                        }, 1000);
                    }
                } else {
                    alert('Vartotojo vieta nežinoma.');
                }
                break;
                
            case 'info':
                if (window.UserDetailUI) window.UserDetailUI.show(user);
                break;
                
            case 'follow':
                if (window.FollowingService) window.FollowingService.start(userId);
                break;
        }
    }

    // === EXPORT ===
    window.UIModule = {
        switchView: switchView,
        renderUsers: renderUsers,
        handleMapPopupAction: handleMapPopupAction
    };
    
    // Global alias for backward compatibility
    window.handleMapPopupAction = handleMapPopupAction;
})();
