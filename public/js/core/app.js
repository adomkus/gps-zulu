// Core application logic - consolidated from app-init.js and main index.html logic
(function(){
    const CoreUtils = window.CoreUtils;
    const perf = window.perf;

    // === APP INITIALIZATION ===
    async function initializeApp(user) {
        window.state.currentUser = user;
        const el = window.el || {};
        
        // Show app, hide auth
        if (el.authContainer) el.authContainer.classList.add('hidden');
        if (el.appContainer) el.appContainer.classList.remove('hidden');
        
        // Initialize modules
        if (window.SettingsModule) window.SettingsModule.loadSettings();
        if (window.notificationManager) await window.notificationManager.init();
        if (window.backgroundManager) window.backgroundManager.init();
        
        // Show admin panel if user is admin
        if (user.isAdmin) {
            const adminPanel = document.getElementById('admin-panel');
            if (adminPanel) {
                adminPanel.style.display = 'block';
                perf.log(`👑 Admin panel activated for user: ${user.username}`);
            }
        }
        
        // Pre-initialize audio context for faster notifications
        if (window.state.settings.sound) {
            setTimeout(() => {
                if (window.initAudioContext) {
                    window.initAudioContext().then(() => {
                        perf.log(`🔊 Audio context pre-initialized`);
                    });
                }
            }, 1000);
        }
        
        // Initialize map and socket
        if (window.MapModule) window.MapModule.initMap();
        setTimeout(connectSocket, 300);
        if (window.Connection) window.Connection.updateConnectionDetails('Jungiama...', false);
        // rodyti statuso pill iškart
        try {
            const pill = document.getElementById('connection-status');
            const text = document.getElementById('connection-text');
            if (pill) pill.style.display = 'block';
            if (text) text.textContent = 'Jungiama...';
        } catch(_) {}
        
        // Start location updates and setup UI
        if (window.LocationModule) window.LocationModule.startLocationUpdates();
        if (window.EventListeners && window.EventListeners.setupAppEventListeners) {
            window.EventListeners.setupAppEventListeners();
        }
        if (window.UIModule) window.UIModule.switchView('users-view');
        
        // Load initial data
        try {
            const data = await window.Api.fetch('/initial-data');
            if (data.currentUser) {
                window.state.currentUser = data.currentUser;
                perf.log(`👤 Current user: ${data.currentUser.username} (ID: ${data.currentUser.id})`);
            }
            if (data.allUsers) {
                window.state.allUsers = new Map(data.allUsers.map(u => [u.id, u]));
                perf.log(`📊 Loaded ${data.allUsers.length} total users`);
            }
            if (!window.state.allUsers) {
                window.state.allUsers = new Map();
            }
            if (window.UIModule) window.UIModule.renderUsers(data.onlineUsers || []);
            
            // Initialize general chat
            if (window.Chat && window.Chat.setupGeneralChat) {
                window.Chat.setupGeneralChat();
            }
            
            perf.log('Pradinis duomenų užkrovimas baigtas');
        } catch (err) {
            perf.log(`Klaida gaunant pradinius duomenis: ${err.message}`);
        }
    }

    // === SOCKET CONNECTION ===
    function connectSocket() {
        if (window.socket) {
            try {
                window.socket.disconnect();
            } catch(_) {}
            window.socket = null;
        }
        
        const path = (window.AppConfig && window.AppConfig.SOCKET_PATH) ? 
            window.AppConfig.SOCKET_PATH : '/socket.io/';
        
        const sock = io({
            path: path,
            timeout: 30000,
            forceNew: true,
            reconnection: true,
            reconnectionAttempts: 50,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 15000,
            randomizationFactor: 0.5,
            withCredentials: true,
            transports: ['polling', 'websocket'],
            upgrade: true,
            rememberUpgrade: true
        });
        
        window.socket = sock;
        
        // Wire socket events
        if (window.Connection) window.Connection.wireLatency(sock);
        if (window.SocketEvents) window.SocketEvents.wire(sock);
    }

    // === STARTUP ===
    function initializeAppOnLoad() {
        // Mobile viewport height fix
        CoreUtils.setVH();
        window.addEventListener('resize', CoreUtils.setVH);
        window.addEventListener('orientationchange', () => {
            setTimeout(CoreUtils.setVH, 100);
        });
        
        // Prevent page zoom on input focus (iOS)
        document.addEventListener('touchstart', {}, true);
        
        // Setup auth event listeners
        if (window.AuthModule) {
            // Vykdyti tik tada, jei autorizacijos langas yra DOM'e
            if (document.getElementById('auth-container')) {
                window.AuthModule.setupAuthEventListeners();
            }
        }
        
        // Start session management
        if (window.SessionService) {
            window.SessionService.startKeepAlive();
            window.SessionService.checkSession();
        }
    }

    // === EXPORT ===
    window.initializeApp = initializeApp;
    window.connectSocket = connectSocket;
    
    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAppOnLoad);
    } else {
        initializeAppOnLoad();
    }
})();
