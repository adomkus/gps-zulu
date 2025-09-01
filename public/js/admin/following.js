// User following functionality - consolidated from following.js
(function(){
    const perf = window.perf;

    let followingUserId = null;
    let followingInterval = null;
    let followingTimeout = null;

    function startFollowingUser(userId) {
        // Stop previous following if exists
        if (followingUserId) {
            stopFollowingUser();
        }
        
        followingUserId = userId;
        const state = window.state || {};
        const map = (window.MapModule && window.MapModule.getMap && window.MapModule.getMap());
        const user = state.allUsers && state.allUsers.get(userId);
        const username = (user && user.username) || 'vartotojo';
        
        perf.log(`🎯 Pradėtas ${username} sekimas`);
        if (window.MessagesModule && window.MessagesModule.addSystemMessage) {
            window.MessagesModule.addSystemMessage(`🎯 Pradėtas ${username} sekimas. Žemėlapis automatiškai seks šį vartotoją 2 minutes.`);
        }
        
        // Center immediately
        const loc = state.onlineUsers && state.onlineUsers.get(userId);
        if (map && loc && loc.lat && loc.lon) {
            map.setView([loc.lat, loc.lon], 16, { animate: true });
        }
        
        // Center map every 3 seconds
        followingInterval = setInterval(() => {
            if (followingUserId !== userId) {
                clearInterval(followingInterval);
                return;
            }
            
            const cur = state.onlineUsers && state.onlineUsers.get(userId);
            if (map && cur && cur.lat && cur.lon) {
                map.setView([cur.lat, cur.lon], map.getZoom(), { 
                    animate: true, 
                    duration: 1.0 
                });
            }
        }, 3000);
        
        // Automatically stop following after 2 minutes
        followingTimeout = setTimeout(() => {
            if (followingUserId === userId) {
                stopFollowingUser();
                if (window.MessagesModule) {
                    window.MessagesModule.addSystemMessage(`⏹️ ${username} sekimas baigtas automatiškai po 2 minučių.`);
                }
                perf.log('Vartotojo sekimas sustabdytas automatiškai');
            }
        }, 120000);
        
        showIndicator(username);
    }

    function stopFollowingUser() {
        if (followingInterval) {
            clearInterval(followingInterval);
            followingInterval = null;
        }
        if (followingTimeout) {
            clearTimeout(followingTimeout);
            followingTimeout = null;
        }
        followingUserId = null;
        hideIndicator();
    }

    function showIndicator(username) {
        let indicator = window.el && window.el.followingIndicator ? window.el.followingIndicator : document.getElementById('following-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'following-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--primary-color);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: bold;
                z-index: 1001;
                box-shadow: 0 4px 12px rgba(0,123,255,0.3);
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(indicator);
        }
        
        indicator.innerHTML = `🎯 Sekamas: ${username} <span style="opacity:0.8">(spustelėkite sustabdyti)</span>`;
        indicator.onclick = () => {
            stopFollowingUser();
            if (window.MessagesModule) {
                window.MessagesModule.addSystemMessage(`⏹️ ${username} sekimas sustabdytas.`);
            }
        };
        indicator.style.display = 'block';
    }

    function hideIndicator() {
        const indicator = window.el && window.el.followingIndicator ? window.el.followingIndicator : document.getElementById('following-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // === EXPORT ===
    window.FollowingService = {
        start: startFollowingUser,
        stop: stopFollowingUser
    };
})();
