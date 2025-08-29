// Global state management - consolidated from state.js
(function(){
    // === GLOBAL STATE ===
    window.state = {
        currentUser: null,
        onlineUsers: new Map(),
        allUsers: new Map(),
        activeChat: { roomId: null, roomName: null },
        settings: {
            sound: true,
            vibrate: true,
            backgroundLocation: true,
            backgroundNotifications: true,
            theme: 'light'
        },
        isAppVisible: true,
        lastKnownLocation: null,
        previousLocation: null,
        connectionStatus: 'disconnected',
        activeContextUser: null
    };

    // === STATE UTILITIES ===
    function updateState(updates) {
        Object.assign(window.state, updates);
    }

    function getState() {
        return window.state;
    }

    // === EXPORT ===
    window.StateManager = {
        update: updateState,
        get: getState
    };
})();
