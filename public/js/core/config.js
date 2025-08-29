// Application configuration - consolidated from config.js
(function(){
    // === APP CONFIGURATION ===
    window.AppConfig = {
        API_BASE_URL: 'https://gps.zulu.1x.lt',
        SOCKET_PATH: '/socket.io/',
        ALLOW_DEV_URLS: false
    };

    // === CONFIG UTILITIES ===
    function getConfig(key) {
        return window.AppConfig[key];
    }

    function setConfig(key, value) {
        window.AppConfig[key] = value;
    }

    // === EXPORT ===
    window.ConfigManager = {
        get: getConfig,
        set: setConfig
    };
})();
