// Notifications, audio and vibration - consolidated from notifications.js
(function(){
    const perf = window.perf;

    let audioContext;

    // === NOTIFICATION MANAGER ===
    const notificationManager = {
        permission: 'default',
        
        async init() {
            // Request notification permission
            if ('Notification' in window) {
                this.permission = await Notification.requestPermission();
                perf.log(`Notification permission: ${this.permission}`);
            }
            this.updatePermissionStatus();
        },
        
        updatePermissionStatus() {
            const statusEl = document.getElementById('permissions-status');
            if (!statusEl) return;
            
            let statusHTML = '';
            let hasIssues = false;
            
            // Check user interaction requirement for audio
            const audioReady = audioContext && audioContext.state === 'running';
            const notificationReady = 'Notification' in window && Notification.permission === 'granted';
            
            // Notification permission
            if ('Notification' in window) {
                const permission = Notification.permission;
                if (permission === 'denied') {
                    hasIssues = true;
                    statusHTML += `
                        <div class="alert alert-warning">
                            <span>⚠️</span>
                            <div>
                                <strong>Pranešimai užblokuoti</strong><br>
                                Pranešimai neveiks. Norėdami juos įjungti:
                                <br><br>
                                <strong>Chrome/Edge:</strong> Spauskite 🔒 šalia adreso → Leidimais → Pranešimai → Leisti<br>
                                <strong>Firefox:</strong> Spauskite ℹ️ šalia adreso → Leidimais → Pranešimai<br>
                                <strong>Safari:</strong> Safari meniu → Nustatymai → Svetainės → Pranešimai
                                <button class="settings-link-btn" onclick="location.reload()">🔄 Perkrauti po pakeitimų</button>
                            </div>
                        </div>
                    `;
                } else if (permission === 'default') {
                    hasIssues = true;
                    statusHTML += `
                        <div class="alert alert-info">
                            <span>📢</span>
                            <div>
                                <strong>Reikia leidimo pranešimams</strong><br>
                                Spausdami "Leisti" gausite pranešimus apie naujas žinutes.
                                <button class="settings-link-btn" onclick="notificationManager.requestPermission()">📱 Prašyti leidimo</button>
                            </div>
                        </div>
                    `;
                }
            }
            
            // Audio context status
            if (!audioReady && !localStorage.getItem('audioActivated')) {
                hasIssues = true;
                const isAndroid = navigator.userAgent.includes('Android');
                statusHTML += `
                    <div class="alert alert-info">
                        <span>🔊</span>
                        <div>
                            <strong>Audio reikia suaktyvinti</strong><br>
                            ${isAndroid ? 
                                'Android naršyklės reikalauja vartotojo veiksmo audio paleidimui.<br>' +
                                'Taip pat patikrinkite telefono nustatymus:<br>' +
                                '<strong>Nustatymai → Apps → Chrome/Firefox → Leidimai → Mikrofono</strong>' :
                                'Mobilės naršyklės reikalauja vartotojo veiksmo audio paleidimui.'
                            }<br>
                            Išbandykite garsą paspausdami "Išbandyti garsą" mygtuką žemiau.
                        </div>
                    </div>
                `;
            }
            
            // Vibration support
            if (!('vibrate' in navigator)) {
                statusHTML += `
                    <div class="alert alert-warning">
                        <span>📳</span>
                        <div>
                            <strong>Vibracija nepalaikoma</strong><br>
                            Jūsų įrenginys nepaliao vibracijos funkcijos.
                        </div>
                    </div>
                `;
            }
            
            // Success message if all is working
            if (!hasIssues && audioReady && notificationReady) {
                statusHTML += `
                    <div class="alert alert-success">
                        <span>✅</span>
                        <div>
                            <strong>Viskas veikia!</strong><br>
                            Audio, vibracija ir pranešimai sukonfigūruoti teisingai.
                        </div>
                    </div>
                `;
            }
            
            statusEl.innerHTML = statusHTML;
        },
        
        async requestPermission() {
            if ('Notification' in window) {
                this.permission = await Notification.requestPermission();
                this.updatePermissionStatus();
                perf.log(`New notification permission: ${this.permission}`);
            }
        },
        
        showNotification(title, options = {}) {
            const state = window.state || {};
            const shouldShowNotification = !state.isAppVisible && this.permission === 'granted' && state.settings.backgroundNotifications;
            
            perf.log(`📱 Background notification check: isAppVisible=${state.isAppVisible}, permission=${this.permission}, backgroundNotifications=${state.settings.backgroundNotifications}, shouldShow=${shouldShowNotification}`);
            
            if (shouldShowNotification) {
                try {
                    const notification = new Notification(title, {
                        icon: '/gps/favicon.ico',
                        badge: '/gps/favicon.ico',
                        tag: 'gps-message',
                        requireInteraction: false,
                        silent: false,
                        vibrate: [200, 100, 200],
                        ...options
                    });
                    
                    notification.onclick = () => {
                        window.focus();
                        notification.close();
                    };
                    
                    notification.onshow = () => {
                        perf.log(`✅ Background notification shown: ${title}`);
                    };
                    
                    notification.onerror = (error) => {
                        perf.log(`❌ Background notification error:`, error);
                    };
                    
                    // Auto close after 8 seconds
                    setTimeout(() => {
                        try {
                            notification.close();
                        } catch (e) {
                            perf.log(`Error closing notification:`, e);
                        }
                    }, 8000);
                    
                } catch (error) {
                    perf.log(`❌ Failed to create background notification:`, error);
                    // Fallback: try to play sound even if notification fails
                    if (state.settings.sound) {
                        playNotificationSound();
                    }
                }
            } else {
                perf.log(`📱 Background notification skipped: conditions not met`);
            }
        }
    };

    // === AUDIO FUNCTIONS ===
    async function initAudioContext() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                perf.log('Audio context created');
            } catch (err) {
                perf.log(`Audio context creation failed: ${err.message}`);
                return false;
            }
        }
        
        // Enhanced mobile audio handling - specifically for Android
        if (audioContext.state === 'suspended') {
            try {
                await audioContext.resume();
                perf.log('Audio context resumed');
                
                // Android specific: create and play a silent buffer to unlock audio
                if (navigator.userAgent.includes('Android')) {
                    const buffer = audioContext.createBuffer(1, 1, 22050);
                    const source = audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioContext.destination);
                    source.start(0);
                    perf.log('Android audio unlocked');
                }
                
            } catch (err) {
                perf.log(`Audio context resume failed: ${err.message}`);
                return false;
            }
        }
        
        return audioContext.state === 'running';
    }

    async function playNotificationSound(testMode = false) {
        const state = window.state || {};
        if (!testMode && !state.settings.sound) return false;
        
        try {
            const audioReady = await initAudioContext();
            if (!audioReady) {
                if (testMode) {
                    const isAndroid = navigator.userAgent.includes('Android');
                    alert(`Audio sistema nepasiekiama. ${isAndroid ? 
                        'Android sistemoje patikrinkite:\n1. Nustatymai → Garsas → Medijos garsumas\n2. Nustatymai → Apps → Chrome → Leidimai\n3. Telefonas "Netrukdyti" režime?' : 
                        'Bandykite perkrauti puslapį.'}`);
                }
                return false;
            }
            
            // Enhanced background audio handling
            const isBackground = !state.isAppVisible;
            perf.log(`🔊 Playing notification sound (background: ${isBackground})`);
            
            // Create enhanced notification sound for Android
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Enhanced audio for background mode
            if (navigator.userAgent.includes('Android')) {
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                
                const volume = isBackground ? 0.8 : 0.6;
                const duration = isBackground ? 1.5 : 1.0;
                
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
                
                perf.log(`🔊 Android audio: volume=${volume}, duration=${duration}, background=${isBackground}`);
            } else {
                // iOS and other platforms
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
                
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.6);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.6);
            }
            
            // Mark audio as activated
            localStorage.setItem('audioActivated', 'true');
            
            if (testMode) {
                perf.log('Test audio played successfully');
                const isAndroid = navigator.userAgent.includes('Android');
                setTimeout(() => {
                    notificationManager.updatePermissionStatus();
                    if (isAndroid) {
                        alert('Garsas paleistas!\n\nJei negirdėjote:\n1. Patikrinkite medijos garsumą telefone\n2. Nustatymai → Garsas → Medijos garsumas\n3. Išjunkite "Netrukdyti" režimą');
                    }
                }, 100);
            }
            
            return true;
        } catch (err) {
            perf.log(`Audio error: ${err.message}`);
            if (testMode) {
                const isAndroid = navigator.userAgent.includes('Android');
                alert(`Audio klaida: ${err.message}\n\n${isAndroid ? 
                    'Android sistemoje:\n1. Nustatymai → Apps → Chrome → Leidimai → Mikrofono\n2. Patikrinkite medijos garsumą\n3. Bandykite perkrauti puslapį' : 
                    'Bandykite perkrauti puslapį.'}`);
            }
            return false;
        }
    }

    // === VIBRATION FUNCTIONS ===
    function triggerVibration(testMode = false) {
        const state = window.state || {};
        if (!testMode && !state.settings.vibrate) return false;
        
        if ('vibrate' in navigator) {
            try {
                // Android-optimized vibration patterns
                let pattern;
                if (navigator.userAgent.includes('Android')) {
                    pattern = testMode ? 
                        [500, 200, 500, 200, 500] :
                        [300, 150, 300, 150, 300, 150, 300];
                } else {
                    pattern = testMode ? [300, 100, 300] : [200, 100, 200, 100, 200];
                }
                
                // Stop any existing vibration first
                navigator.vibrate(0);
                
                // Small delay and then trigger new pattern
                setTimeout(() => {
                    const success = navigator.vibrate(pattern);
                    
                    if (testMode) {
                        if (success !== false) {
                            perf.log('Test vibration triggered successfully');
                            setTimeout(() => {
                                alert('Vibracija suaktyvinta! Jei nejutote vibracijos, patikrinkite telefono nustatymus:\n\n' +
                                     'Android: Nustatymai → Garsas ir vibracija → Vibracija\n' +
                                     'Arba: Nustatymai → Pritaikymas neįgaliesiems → Vibracija');
                            }, 100);
                        } else {
                            alert('Vibracija nepavyko. Patikrinkite įrenginio nustatymus.');
                        }
                    }
                    
                    return success;
                }, 50);
                
                return true;
            } catch (err) {
                perf.log(`Vibration error: ${err.message}`);
                if (testMode) {
                    alert(`Vibracijos klaida: ${err.message}\n\nPatikrinkite telefono nustatymus:\nAndroid: Nustatymai → Garsas ir vibracija → Vibracija`);
                }
                return false;
            }
        } else {
            if (testMode) {
                alert('Jūsų įrenginys nepalako vibracijos funkcijos.\n\nArba vibracija išjungta naršyklės nustatymuose.');
            }
            return false;
        }
    }

    // === EXPORT ===
    window.notificationManager = notificationManager;
    window.initAudioContext = initAudioContext;
    window.playNotificationSound = playNotificationSound;
    window.triggerVibration = triggerVibration;
})();
