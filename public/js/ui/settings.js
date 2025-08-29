/**
 * Settings Module - Manages user settings and preferences
 */
window.SettingsModule = (function() {
    'use strict';

    // Default settings
    const defaultSettings = {
        sound: true,
        vibrate: true,
        backgroundLocation: true,
        backgroundNotifications: true,
        theme: 'light',
        markerColor: 'red'
    };

    // Current settings
    let currentSettings = { ...defaultSettings };

    /**
     * Load settings from localStorage
     */
    function loadSettings() {
        try {
            const saved = localStorage.getItem('gpsAppSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                currentSettings = { ...defaultSettings, ...parsed };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
        applySettings(currentSettings);
        return currentSettings;
    }

    /**
     * Save settings to localStorage
     */
    function saveSettings(settings) {
        try {
            localStorage.setItem('gpsAppSettings', JSON.stringify(settings));
            currentSettings = { ...settings };
        } catch (error) {
            console.error('Error saving settings:', error);
        }
        // Immediately reflect changes in UI
        try { applySettings(currentSettings); } catch(_) {}
    }

    /**
     * Apply settings to the UI
     */
    function applySettings(settings) {
        // Apply theme
        if (settings.theme === 'dark') {
            document.documentElement.classList.add('theme-dark');
        } else {
            document.documentElement.classList.remove('theme-dark');
        }

        // Update UI elements if they exist
        if (window.el && window.el.soundToggle) {
            window.el.soundToggle.checked = settings.sound;
        }
        if (window.el && window.el.vibrateToggle) {
            window.el.vibrateToggle.checked = settings.vibrate;
        }
        if (window.el && window.el.backgroundLocationToggle) {
            window.el.backgroundLocationToggle.checked = settings.backgroundLocation;
        }
        if (window.el && window.el.backgroundNotificationsToggle) {
            window.el.backgroundNotificationsToggle.checked = settings.backgroundNotifications;
        }
        if (window.el && window.el.themeToggle) {
            window.el.themeToggle.checked = settings.theme === 'dark';
        }
        const colorSel = document.getElementById('marker-color');
        if (colorSel) colorSel.value = settings.markerColor || 'red';
    }

    /**
     * Setup settings event listeners
     */
    function setupSettingsEventListeners() {
        if (!window.el) return;

        // Sound setting
        if (window.el.soundToggle) {
            window.el.soundToggle.addEventListener('change', function() {
                currentSettings.sound = this.checked;
                saveSettings(currentSettings);
            });
        }

        // Vibration setting
        if (window.el.vibrateToggle) {
            window.el.vibrateToggle.addEventListener('change', function() {
                currentSettings.vibrate = this.checked;
                saveSettings(currentSettings);
            });
        }

        // Background location setting
        if (window.el.backgroundLocationToggle) {
            window.el.backgroundLocationToggle.addEventListener('change', function() {
                currentSettings.backgroundLocation = this.checked;
                saveSettings(currentSettings);
                
                // Update background module if available
                if (window.backgroundManager) {
                    if (this.checked) {
                        window.backgroundManager.startBackgroundLocationUpdates();
                    }
                }
            });
        }

        // Background notifications setting
        if (window.el.backgroundNotificationsToggle) {
            window.el.backgroundNotificationsToggle.addEventListener('change', function() {
                currentSettings.backgroundNotifications = this.checked;
                saveSettings(currentSettings);
            });
        }

        // Theme setting
        if (window.el.themeToggle) {
            window.el.themeToggle.addEventListener('change', function() {
                currentSettings.theme = this.checked ? 'dark' : 'light';
                saveSettings(currentSettings);
                applySettings(currentSettings);
            });
        }
        const colorSel2 = document.getElementById('marker-color');
        if (colorSel2) {
            colorSel2.addEventListener('change', function() {
                currentSettings.markerColor = this.value || 'red';
                saveSettings(currentSettings);
                if (window.MapModule && window.MapModule.renderMapMarkers) {
                    setTimeout(() => window.MapModule.renderMapMarkers(), 50);
                }
            });
        }
    }

    /**
     * Initialize settings module
     */
    function init() {
        loadSettings();
        applySettings(currentSettings);
        
        // Setup event listeners when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupSettingsEventListeners);
        } else {
            setupSettingsEventListeners();
        }
    }

    /**
     * Get current settings
     */
    function getSettings() {
        return { ...currentSettings };
    }

    /**
     * Update a specific setting
     */
    function updateSetting(key, value) {
        currentSettings[key] = value;
        saveSettings(currentSettings);
        applySettings(currentSettings);
    }

    // Initialize when module loads
    init();

    // Return public API
    return {
        getSettings,
        updateSetting,
        applySettings,
        loadSettings,
        setupSettingsEventListeners
    };
})();
