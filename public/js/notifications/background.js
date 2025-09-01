// Background mode functionality - consolidated from background.js
(function(){
    const perf = window.perf;

    let wakeLock = null;

    // === BACKGROUND MANAGER ===
    const backgroundManager = {
        init() {
            this.setupVisibilityChange();
            this.setupWakeLock();
            perf.log('Background manager initialized');
        },

        setupVisibilityChange() {
            document.addEventListener('visibilitychange', () => {
                const state = window.state || {};
                state.isAppVisible = !document.hidden;
                
                perf.log(`📱 App visibility changed: ${state.isAppVisible ? 'visible' : 'background'}`);
                
                if (state.isAppVisible) {
                    // App became visible
                    this.handleAppVisible();
                } else {
                    // App went to background
                    this.handleAppBackground();
                }
            });
        },

        setupWakeLock() {
            if ('wakeLock' in navigator) {
                try {
                    navigator.wakeLock.request('screen').then(lock => {
                        wakeLock = lock;
                        perf.log('Wake lock acquired');
                        
                        wakeLock.addEventListener('release', () => {
                            perf.log('Wake lock released');
                            wakeLock = null;
                        });
                    }).catch(err => {
                        perf.log('Wake lock request failed:', err);
                    });
                } catch (err) {
                    perf.log('Wake lock setup failed:', err);
                }
            }
        },

        handleAppVisible() {
            const state = window.state || {};
            
            // Release wake lock when app becomes visible
            if (wakeLock) {
                try {
                    wakeLock.release();
                    wakeLock = null;
                    perf.log('Wake lock released (app visible)');
                } catch (err) {
                    perf.log('Wake lock release failed:', err);
                }
            }
            
            // Notify server that app is visible
            if (window.socket && window.socket.connected) {
                window.socket.emit('app_going_foreground');
                perf.log('📱 Notified server: app going foreground');
            }
        },

        handleAppBackground() {
            const state = window.state || {};
            
            // Request wake lock when app goes to background
            if ('wakeLock' in navigator && !wakeLock) {
                try {
                    navigator.wakeLock.request('screen').then(lock => {
                        wakeLock = lock;
                        perf.log('Wake lock acquired (app background)');
                    }).catch(err => {
                        perf.log('Wake lock request failed (background):', err);
                    });
                } catch (err) {
                    perf.log('Wake lock setup failed (background):', err);
                }
            }
            
            // Notify server that app is in background
            if (window.socket && window.socket.connected) {
                window.socket.emit('app_going_background');
                perf.log('📱 Notified server: app going background');
            }
            
            // Start background location updates if enabled
            const backgroundLocationToggle = window.el && window.el.backgroundLocationToggle ? 
                window.el.backgroundLocationToggle : document.getElementById('settings-background-location');
            
            if (backgroundLocationToggle && backgroundLocationToggle.checked) {
                this.startBackgroundLocationUpdates();
            }
        },

        startBackgroundLocationUpdates() {
            if ('geolocation' in navigator) {
                const options = {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 30000
                };
                
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const coords = position.coords;
                        perf.log(`📍 Background location update: ${coords.latitude}, ${coords.longitude}`);
                        
                        // Send to server
                        if (window.socket && window.socket.connected) {
                            window.socket.emit('update location', {
                                lat: coords.latitude,
                                lon: coords.longitude,
                                accuracy: coords.accuracy,
                                timestamp: Date.now()
                            });
                        }
                    },
                    (error) => {
                        perf.log(`❌ Background location error: ${error.message}`);
                    },
                    options
                );
            }
        }
    };

    // === EXPORT ===
    window.backgroundManager = backgroundManager;
})();
