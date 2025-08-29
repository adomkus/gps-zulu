// Socket.IO communication - consolidated from socket.js, connection.js, socket-events.js
(function(){
    const perf = window.perf;

    // === CONNECTION MANAGEMENT ===
    function updateConnectionDetails(text, ok) {
        try {
            const details = document.getElementById('connection-details');
            const indicator = document.getElementById('connection-indicator');
            if (details && typeof text === 'string') details.textContent = text;
            if (indicator) indicator.style.background = ok ? 'var(--primary-color)' : 'var(--danger-color)';

            // Update floating status pill as well
            const statusPill = document.getElementById('connection-status');
            const statusText = document.getElementById('connection-text');
            const dot = document.getElementById('connection-dot');
            if (statusText && typeof text === 'string') {
                statusText.textContent = text;
            }
            if (statusPill) {
                statusPill.style.display = 'block';
                statusPill.classList.remove('connected', 'disconnected');
                statusPill.classList.add(ok ? 'connected' : 'disconnected');
            }
            if (dot) {
                dot.style.background = ok ? '#16a34a' : '#dc2626';
            }
        } catch(_) {}
    }

    function wireLatency(socket) {
        if (!socket) return;
        
        setInterval(() => {
            if (socket && socket.connected) {
                const ts = Date.now();
                socket.emit('client_ping', ts);
            }
        }, 10000);
        
        socket.on('client_pong', (ts) => {
            const rtt = Date.now() - ts;
            const d = document.getElementById('connection-details');
            if (d) d.textContent = 'Prisijungta • Vėlinimas ~ ' + rtt + ' ms';
        });
    }

    // === SOCKET EVENTS ===
    function wireSocketEvents(socket) {
        if (!socket) return;
        
        // Connection events
        socket.on('connect', () => {
            perf.log('Socket connected successfully');
            updateConnectionDetails('Prisijungta', true);
            // paprašome serverio online sąrašo, jei UI dar neturi
            try { if (window.socket) window.socket.emit('client_ping', Date.now()); } catch(_) {}
        });
        
        socket.on('disconnect', (reason) => {
            perf.log('Socket disconnected: ' + reason);
            updateConnectionDetails('Atsijungta (' + reason + ')', false);
            // pažymime ryšį kaip neprisijungusį
            try {
                const pill = document.getElementById('connection-status');
                if (pill) { pill.classList.remove('connected'); pill.classList.add('disconnected'); }
                const dot = document.getElementById('connection-dot');
                if (dot) dot.style.background = '#dc2626';
            } catch(_) {}
            setTimeout(() => {
                if (window.state.currentUser && (!socket || !socket.connected)) {
                    perf.log('Attempting to reconnect...');
                    if (window.connectSocket) window.connectSocket();
                }
            }, 3000);
        });
        
        socket.on('connect_error', (error) => {
            perf.log('Socket connection error: ' + error.message);
            updateConnectionDetails('Klaida: ' + error.message, false);
        });
        
        socket.on('reconnect', (attemptNumber) => {
            perf.log('Socket reconnected after ' + attemptNumber + ' attempts');
            updateConnectionDetails('Prisijungta (bandymai: ' + attemptNumber + ')', true);
        });
        
        socket.on('reconnect_error', (error) => {
            perf.log('Socket reconnection error: ' + error.message);
        });
        
        socket.on('reconnect_failed', () => {
            perf.log('Socket reconnection failed');
        });

        // Application events
        socket.on('online users update', (list) => {
            if (window.UIModule) window.UIModule.renderUsers(list);
        });
        
        socket.on('private chat started', (payload) => {
            try {
                if (window.MessagesModule && window.MessagesModule.showChat) {
                    window.MessagesModule.showChat(payload.roomId, payload.roomName);
                } else if (window.showChat) {
                    window.showChat(payload.roomId, payload.roomName);
                }
            } catch(e) {
                perf.log('❌ showChat error: ' + e.message);
            }
        });
        
        socket.on('new message', (message) => {
            const state = window.state || {};
            if (state.activeChat && state.activeChat.roomId === message.room_id) {
                if (window.MessagesModule && window.MessagesModule.addMessageToUI) {
                    window.MessagesModule.addMessageToUI(message);
                }
            }
            
            if (message.sender_id !== (state.currentUser && state.currentUser.id)) {
                const isCurrent = state.activeChat && state.activeChat.roomId === message.room_id;
                if (!state.isAppVisible || !isCurrent) {
                    if (window.notificationManager) {
                        window.notificationManager.showNotification(
                            'Nauja žinutė nuo ' + (message.sender_username || 'Nezinomas'),
                            { body: (message.content || '').substring(0,100), timestamp: Date.now() }
                        );
                    }
                }
                if (window.playNotificationSound) window.playNotificationSound();
                if (window.triggerVibration) window.triggerVibration();
            }
        });
        
        socket.on('message deleted', (p) => {
            perf.log('🗑️ Message deleted event: ' + p.messageId);
            const el = document.querySelector('[data-message-id="' + p.messageId + '"]');
            if (el) {
                el.remove();
                if (window.MessagesModule) window.MessagesModule.addSystemMessage('🗑️ Žinutė ištrinta administratoriaus');
            }
        });
        
        socket.on('message read', (p) => {
            perf.log('✓ Message read event: ' + p.messageId);
            const el = document.querySelector('[data-message-id="' + p.messageId + '"]');
            if (el) {
                const readStatusEl = el.querySelector('.read-status');
                if (readStatusEl) {
                    readStatusEl.textContent = '✓✓';
                    readStatusEl.style.color = 'var(--success-color)';
                }
            }
        });
        
        socket.on('user deleted', (p) => {
            const state = window.state || {};
            if (state.currentUser && state.currentUser.id === p.userId) {
                alert('Jūsų paskyra buvo ištrinta administratoriaus.');
                window.location.reload();
            } else {
                if (window.MessagesModule) window.MessagesModule.addSystemMessage('👤 Vartotojas ištrintas administratoriaus');
            }
        });
        
        socket.on('user approved', (p) => {
            if (window.MessagesModule) window.MessagesModule.addSystemMessage('✅ Vartotojas ' + p.username + ' patvirtintas administratoriaus');
        });
        
        socket.on('error', (error) => {
            perf.log('❌ Socket error: ' + (error && error.message ? error.message : 'unknown'));
            if (error && error.message) {
                alert('Serverio klaida: ' + error.message);
                if (window.MessagesModule) window.MessagesModule.addSystemMessage('⚠️ Serverio klaida: ' + error.message);
            } else {
                alert('Nežinoma serverio klaida: ' + JSON.stringify(error));
                if (window.MessagesModule) window.MessagesModule.addSystemMessage('⚠️ Nežinoma klaida: ' + JSON.stringify(error));
            }
        });
    }

    // === EXPORT ===
    window.Connection = {
        updateConnectionDetails: updateConnectionDetails,
        wireLatency: wireLatency
    };
    
    window.SocketEvents = { wire: wireSocketEvents };
})();
