// DOM element references - consolidated from dom.js
(function(){
    // === DOM ELEMENT REFERENCES ===
    function initDOMReferences() {
        window.el = {
            // Auth elements
            authContainer: document.getElementById('auth-container'),
            appContainer: document.getElementById('app-container'),
            loginForm: document.getElementById('login-form'),
            registerForm: document.getElementById('register-form-submit'),
            showRegisterLink: document.getElementById('show-register'),
            showLoginLink: document.getElementById('show-login'),
            rememberMe: document.getElementById('remember-me'),
            
            // Main app elements
            showListBtn: document.querySelector('[data-view="users-list-view"]'),
            showMapBtn: document.querySelector('[data-view="map-view"]'),
            showSettingsBtn: document.querySelector('[data-view="settings-view"]'),
            
            // Secondary navigation
            showUsersListBtn: document.querySelector('[data-view="users-list-sub-view"]'),
            showGeneralChatBtn: document.querySelector('[data-view="general-chat-sub-view"]'),
            showMyChatsBtn: document.querySelector('[data-view="my-chats-sub-view"]'),
            showUnreadChatsBtn: document.querySelector('[data-view="unread-chats-sub-view"]'),

            // Views & Sub-views
            usersView: document.getElementById('users-view'),
            mapView: document.getElementById('map-view'),
            settingsView: document.getElementById('settings-view'),
            mapContainer: document.getElementById('map'),
            
            usersListSubView: document.getElementById('users-list-sub-view'),
            generalChatSubView: document.getElementById('general-chat-sub-view'),
            myChatsSubView: document.getElementById('my-chats-sub-view'),
            unreadChatsSubView: document.getElementById('unread-chats-sub-view'),

            // Users
            usersList: document.getElementById('users-list'),
            
            // Chat elements
            chatView: document.getElementById('chat-view'),
            chatHeaderTitle: document.getElementById('chat-header-title'),
            messagesList: document.getElementById('messages-list'),
            messageForm: document.getElementById('message-form'),
            messageInput: document.getElementById('message-input'),
            backToMainBtn: document.getElementById('back-to-main-btn'),
            chatBackBtn: document.getElementById('chat-back-btn'),
            
            // Settings elements
            soundToggle: document.getElementById('settings-sound'),
            vibrateToggle: document.getElementById('settings-vibrate'),
            backgroundLocationToggle: document.getElementById('settings-background-location'),
            backgroundNotificationsToggle: document.getElementById('settings-background-notifications'),
            themeToggle: document.getElementById('settings-theme'),
            testAudioBtn: document.getElementById('test-audio-btn'),
            testVibrationBtn: document.getElementById('test-vibration-btn'),
            
            // Context menu
            contextMenuOverlay: document.getElementById('context-menu-overlay'),
            contextMenuTitle: document.getElementById('context-menu-title'),
            contextMenuActions: document.getElementById('context-menu-actions'),
            contextMenuWrapper: document.getElementById('context-menu-wrapper'),
            
            // User detail modal
            userDetailModal: document.getElementById('user-detail-modal'),
            userDetailName: document.getElementById('user-detail-name'),
            userDetailRole: document.getElementById('user-detail-role'),
            userDetailBody: document.getElementById('user-detail-body'),
            userDetailClose: document.getElementById('user-detail-close'),
            
            // Connection elements
            connectionDetails: document.getElementById('connection-details'),
            connectionIndicator: document.getElementById('connection-indicator'),
            connectionStatus: document.getElementById('connection-status'),
            connectionText: document.getElementById('connection-text'),
            connectionDot: document.getElementById('connection-dot'),
            
            // Permissions status
            permissionsStatus: document.getElementById('permissions-status'),

            // Settings
            settingsSound: document.getElementById('settings-sound'),
            settingsVibrate: document.getElementById('settings-vibrate'),
            settingsBackgroundLocation: document.getElementById('settings-background-location'),
            settingsBackgroundNotifications: document.getElementById('settings-background-notifications'),
            settingsTheme: document.getElementById('settings-theme'),
            markerColor: document.getElementById('marker-color'),

            // Chat
            generalChatForm: document.getElementById('general-chat-form'),
            generalChatInput: document.getElementById('general-chat-input'),
            generalChatMessages: document.getElementById('general-chat-messages'),
            
            // Secondary navigation buttons
            showUsersListBtn: document.querySelector('[data-view="users-list-sub-view"]'),
            showGeneralChatBtn: document.querySelector('[data-view="general-chat-sub-view"]'),
            showMyChatsBtn: document.querySelector('[data-view="my-chats-sub-view"]'),
            showUnreadChatsBtn: document.querySelector('[data-view="unread-chats-sub-view"]'),
            
            // Admin elements
            pendingUsersBtn: document.getElementById('pending-users-btn'),
            adminLogBtn: document.getElementById('admin-log-btn'),
            
            // Modal controls
            logsClose: document.getElementById('logs-close'),
            logsClear: document.getElementById('logs-clear'),
            logsCopy: document.getElementById('logs-copy'),
            logsModal: document.getElementById('logs-modal'),
            logsModalBody: document.getElementById('logs-modal-body'),
            
            // Settings modal
            settingsClose: document.getElementById('settings-close'),
            settingsModal: document.getElementById('settings-modal'),
            
            // Connection modal
            connModal: document.getElementById('conn-modal'),
            
            // Following indicator
            followingIndicator: document.getElementById('following-indicator'),
            
            // Logout button
            logoutBtn: document.getElementById('logout-btn'),
            
            // Connection modal elements
            connClose: document.getElementById('conn-close'),
            connBody: document.getElementById('conn-body'),
        };
    }

    // === EXPORT ===
    window.domInit = initDOMReferences;
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDOMReferences);
    } else {
        initDOMReferences();
    }
})();
