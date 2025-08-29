// API and session management - consolidated from api.js and session.js
(function(){
    const perf = window.perf;

    // === API HELPERS ===
    function getBase() {
        return (window.AppConfig && window.AppConfig.API_BASE_URL) ? 
            window.AppConfig.API_BASE_URL : '';
    }
    
    async function apiFetch(path, options) {
        const url = path.startsWith('http') ? path : 
            (getBase() + (path.startsWith('/') ? path : '/' + path));
        const opts = Object.assign({ credentials: 'include' }, options || {});
        
        try {
            const res = await fetch(url, opts);
            let data = null;
            try {
                data = await res.json();
            } catch(_) {}
            
            if (!res.ok) {
                const msg = (data && data.message) ? data.message : ('HTTP ' + res.status);
                throw new Error(msg);
            }
            return data;
        } catch (error) {
            if (perf) perf.log('API call error to ' + path + ': ' + error.message);
            throw error;
        }
    }

    // === SESSION MANAGEMENT ===
    async function keepAlive() {
        try {
            await fetch(getBase() + '/ping', { credentials: 'include' });
        } catch(_) {}
    }
    
    function startKeepAlive() {
        setInterval(keepAlive, 60000);
    }

    async function checkSession() {
        try {
            const res = await fetch(getBase() + '/session');
            if (res.ok) {
                const data = await res.json();
                if (data.loggedIn && typeof window.initializeApp === 'function') {
                    window.initializeApp(data.user);
                }
            }
        } catch (e) {
            console.error('Nepavyko patikrinti sesijos:', e);
        }
    }

    // === EXPORT ===
    window.Api = { fetch: apiFetch };
    window.SessionService = { 
        startKeepAlive: startKeepAlive, 
        checkSession: checkSession 
    };
})();
