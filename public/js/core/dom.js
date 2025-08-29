// DOM element references - consolidated from dom.js
(function(){
    // === DOM ELEMENT REFERENCES ===
    function initDOMReferences() {
        window.el = {
            // Auth elements
            authContainer: document.getElementById('auth-container'),
            appContainer: document.getElementById('app-container'),
            loginForm: document.getElementById('login-form'),
            registerForm: document.getElementById('register-form'),
            showRegisterLink: document.getElementById('show-register'),
            showLoginLink: document.getElementById('show-login'),
            
            // Main app elements
            showListBtn: document.querySelector('[data-view="users-list-view"]'),
            showMapBtn: document.querySelector('[data-view="map-view"]'),
            settingsBtn: document.getElementById('settings-btn'),
            logoutBtn: document.getElementById('logout-btn'),
            
            // Users list
            usersList: document.getElementById('users-list'),
            
            // Chat elements
            chatView: document.getElementById('chat-view'),
            chatHeaderTitle: document.getElementById('chat-header-title'),
            messagesList: document.getElementById('messages-list'),
            messageForm: document.getElementById('message-form'),
            messageInput: document.getElementById('message-input'),
            backToMainBtn: document.getElementById('back-to-main-btn'),
            
            // Settings elements
            soundToggle: document.getElementById('sound-toggle'),
            vibrateToggle: document.getElementById('vibrate-toggle'),
            backgroundLocationToggle: document.getElementById('background-location-toggle'),
            backgroundNotificationsToggle: document.getElementById('background-notifications-toggle'),
            themeToggle: document.getElementById('theme-toggle'),
            testAudioBtn: document.getElementById('test-audio-btn'),
            testVibrationBtn: document.getElementById('test-vibration-btn'),
            
            // Context menu
            contextMenuOverlay: document.getElementById('context-menu-overlay'),
            contextMenuTitle: document.getElementById('context-menu-title'),
            contextMenuActions: document.getElementById('context-menu-actions'),
            
            // User detail modal
            userDetailModal: document.getElementById('user-detail-modal'),
            userDetailName: document.getElementById('user-detail-name'),
            userDetailRole: document.getElementById('user-detail-role'),
            userDetailBody: document.getElementById('user-detail-body'),
            userDetailClose: document.getElementById('user-detail-close'),
            
            // Connection elements
            connectionDetails: document.getElementById('connection-details'),
            connectionIndicator: document.getElementById('connection-indicator')
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
