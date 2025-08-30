// Event listeners - consolidated from index.html event handling
(function(){
    const perf = window.perf;

    // === APP EVENT LISTENERS ===
    function setupAppEventListeners() {
        const el = window.el || {};
        
        // View switching
        if (el.showListBtn) {
            el.showListBtn.addEventListener('click', () => {
                Views.switchView('users-view');
                Views.switchSecondaryView('users-list-sub-view');
            });
        }
        
        if (el.showMapBtn) {
            el.showMapBtn.addEventListener('click', () => {
                if (window.UIModule) window.UIModule.switchView('map-view');
            });
        }
        
        // settingsBtn pašalintas – „Nustatymai“ atidaromi tik per viršutinės juostos mygtuką

        // Užtikriname, kad kitos navigacijos vietos nebeatidarys nustatymų netyčia
        document.querySelectorAll('[data-view]')?.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-view');
                if (!window.UIModule) return;
                if (target === 'settings-view') {
                    window.UIModule.switchView('settings-view');
                    try {
                        if (window.SettingsModule) {
                            const s = window.SettingsModule.getSettings();
                            window.SettingsModule.applySettings(s);
                        }
                    } catch(_) {}
                    setTimeout(() => {
                        if (window.notificationManager) window.notificationManager.updatePermissionStatus();
                    }, 100);
                } else {
                    window.UIModule.switchView(target);
                }
            });
        });

        // Users list click handling
        if (el.usersList) {
            el.usersList.addEventListener('click', (e) => {
                const userItem = e.target.closest('.user-item');
                if (userItem) {
                    const userId = Number(userItem.dataset.userId);
                    const state = window.state || {};
                    const user = state.allUsers.get(userId) || 
                        Array.from(state.onlineUsers.values()).find(u => u.userId === userId);
                    if (user && window.ContextMenuUI) {
                        window.ContextMenuUI.show(user);
                    }
                }
            });
        }

        // Context menu handling
        if (el.contextMenuOverlay) {
            el.contextMenuOverlay.addEventListener('click', handleContextMenuAction);
        }

        // Chat functionality
        if (el.backToMainBtn) {
            el.backToMainBtn.addEventListener('click', () => {
                if (window.MessagesModule) window.MessagesModule.hideChat();
            });
        }

        if (el.messageForm) {
            el.messageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const content = el.messageInput.value.trim();
                const state = window.state || {};
                if (content && state.activeChat && state.activeChat.roomId) {
                    if (window.socket) {
                        window.socket.emit('send message', { 
                            roomId: state.activeChat.roomId, 
                            content 
                        });
                    }
                    el.messageInput.value = '';
                    
                    // Scroll to bottom on mobile after sending
                    setTimeout(() => {
                        if (el.messagesList) {
                            el.messagesList.scrollTop = el.messagesList.scrollHeight;
                        }
                    }, 100);
                }
            });
        }

        // Mobile keyboard handling
        if (el.messageInput) {
            el.messageInput.addEventListener('focus', () => {
                // Scroll to keep input visible on mobile
                setTimeout(() => {
                    el.messageInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 300);
            });
            
            el.messageInput.addEventListener('blur', () => {
                // Reset viewport on mobile when keyboard closes
                setTimeout(() => {
                    window.scrollTo(0, 0);
                }, 100);
            });
        }

        // Logout
        if (el.logoutBtn) {
            el.logoutBtn.addEventListener('click', () => {
                window.Api.fetch('/logout', { method: 'POST' }).then(() => {
                    window.location.reload();
                });
            });
        }

        // Test buttons
        const testAudioBtn = document.getElementById('test-audio-btn');
        const testVibrationBtn = document.getElementById('test-vibration-btn');
        
        if (testAudioBtn) {
            testAudioBtn.addEventListener('click', () => {
                if (window.playNotificationSound) window.playNotificationSound(true);
            });
        }
        
        if (testVibrationBtn) {
            testVibrationBtn.addEventListener('click', () => {
                if (window.triggerVibration) window.triggerVibration(true);
            });
        }

        // Admin panel event listeners
        const pendingUsersBtn = document.getElementById('pending-users-btn');
        const adminLogBtn = document.getElementById('admin-log-btn');
        
        if (pendingUsersBtn) {
            pendingUsersBtn.addEventListener('click', () => {
                if (window.AdminService) window.AdminService.showPendingUsers();
            });
        }
        
        if (adminLogBtn) {
            adminLogBtn.addEventListener('click', () => {
                if (window.AdminService) window.AdminService.showAdminLog();
            });
            
            // Admin log modal controls
            const logsClose = document.getElementById('logs-close');
            const logsClear = document.getElementById('logs-clear');
            const logsCopy = document.getElementById('logs-copy');
            const logsModal = document.getElementById('logs-modal');
            const logsBody = document.getElementById('logs-modal-body');
            
            if (logsClose) {
                logsClose.addEventListener('click', () => {
                    if (logsModal) logsModal.style.display = 'none';
                });
            }
            
            if (logsClear) {
                logsClear.addEventListener('click', () => {
                    window.__logBuffer = [];
                    if (logsBody) logsBody.textContent = '';
                });
            }
            
            if (logsCopy) {
                logsCopy.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(logsBody.textContent || '');
                        alert('Logai nukopijuoti.');
                    } catch(_) {}
                });
            }
        }

        // User detail modal events
        if (el.userDetailClose) {
            el.userDetailClose.addEventListener('click', () => {
                if (window.UserDetailUI) window.UserDetailUI.hide();
            });
        }

        // User detail actions - removed as elements don't exist in HTML

        // Settings close button
        const settingsClose = document.getElementById('settings-close');
        if (settingsClose) {
            settingsClose.addEventListener('click', () => {
                const settingsModal = document.getElementById('settings-modal');
                if (settingsModal) settingsModal.classList.add('hidden');
            });
        }

        // Close modal when clicking outside
        if (el.userDetailModal) {
            el.userDetailModal.addEventListener('click', (e) => {
                if (e.target === el.userDetailModal) {
                    if (window.UserDetailUI) window.UserDetailUI.hide();
                }
            });
        }

        // Close modal with ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (el.userDetailModal && !el.userDetailModal.classList.contains('hidden')) {
                    if (window.UserDetailUI) window.UserDetailUI.hide();
                }
                const connModal = document.getElementById('conn-modal');
                if (connModal && connModal.style.display !== 'none') connModal.style.display = 'none';
            }
        });

        // Connection pill click -> open diagnostics
        const statusPill = document.getElementById('connection-status');
        const connModal = document.getElementById('conn-modal');
        const connClose = document.getElementById('conn-close');
        if (statusPill && connModal) {
            statusPill.addEventListener('click', () => {
                try {
                    const body = document.getElementById('conn-body');
                    const s = window.state || {};
                    const sock = window.socket;
                    const info = [
                        'Ryšio būsena: ' + (sock && sock.connected ? 'Prisijungta' : 'Atsijungta'),
                        'Socket ID: ' + (sock && sock.id ? sock.id : 'n/a'),
                        'Vartotojas: ' + (s.currentUser ? (s.currentUser.username + ' (ID ' + s.currentUser.id + ')') : 'n/a'),
                        'Vėlinimas: žr. nustatymuose (rodoma periodiškai)',
                        'Laikas: ' + new Date().toLocaleString('lt-LT')
                    ].join('\n');
                    if (body) body.textContent = info;
                } catch(_) {}
                connModal.style.display = 'flex';
            });
        }
        if (connClose && connModal) {
            connClose.addEventListener('click', () => { connModal.style.display = 'none'; });
        }

        // Secondary navigation events
        el.showUsersListBtn.addEventListener('click', () => {
            Views.switchSecondaryView('users-list-sub-view');
        });
        el.showGeneralChatBtn.addEventListener('click', () => {
            Views.switchSecondaryView('general-chat-sub-view');
            if (window.Chat && window.Chat.setupGeneralChat) {
                window.Chat.setupGeneralChat();
            }
        });
        el.showMyChatsBtn.addEventListener('click', () => {
            Views.switchSecondaryView('my-chats-sub-view');
            Views.renderMyChats();
        });
        el.showUnreadChatsBtn.addEventListener('click', () => {
            Views.switchSecondaryView('unread-chats-sub-view');
        });

        // Chat events
        el.chatBackBtn.addEventListener('click', () => {
            if (window.MessagesModule) window.MessagesModule.hideChat();
        });
    }

    // === CONTEXT MENU ACTION HANDLER ===
    async function handleContextMenuAction(e) {
        const el = window.el || {};
        const state = window.state || {};
        
        const action = e.target.dataset.action;
        if (e.target.closest('[data-action="cancel"]') || e.target === el.contextMenuOverlay) {
            if (window.ContextMenuUI) window.ContextMenuUI.hide();
            return;
        }
        if (!action || !state.activeContextUser) return;
        
        const userId = state.activeContextUser.id || state.activeContextUser.userId;
        let needsUpdate = false;
        
        switch (action) {
            case 'chat':
                if (window.socket) window.socket.emit('initiate private chat', userId);
                break;
            case 'show-on-map':
                if (window.UIModule) window.UIModule.switchView('map-view');
                const userLocation = state.onlineUsers.get(userId);
                if (userLocation?.lat && userLocation?.lon && window.MapModule) {
                    const map = window.MapModule.getMap();
                    if (map) map.setView([userLocation.lat, userLocation.lon], 15);
                }
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
        
        if (window.ContextMenuUI) window.ContextMenuUI.hide();
        
        if (needsUpdate) {
            const data = await window.Api.fetch('/initial-data');
            state.allUsers = new Map(data.allUsers.map(u => [u.id, u]));
            if (window.UIModule) window.UIModule.renderUsers(data.onlineUsers || []);
        }
    }

    // === EXPORT ===
    window.EventListeners = {
        setupAppEventListeners: setupAppEventListeners
    };
})();
