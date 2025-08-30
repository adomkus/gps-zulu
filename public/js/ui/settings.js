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
        if (window.el && window.el.settingsSound) {
            window.el.settingsSound.checked = settings.sound;
        }
        if (window.el && window.el.settingsVibrate) {
            window.el.settingsVibrate.checked = settings.vibrate;
        }
        if (window.el && window.el.settingsBackgroundLocation) {
            window.el.settingsBackgroundLocation.checked = settings.backgroundLocation;
        }
        if (window.el && window.el.settingsBackgroundNotifications) {
            window.el.settingsBackgroundNotifications.checked = settings.backgroundNotifications;
        }
        if (window.el && window.el.settingsTheme) {
            window.el.settingsTheme.value = settings.theme;
        }
        if (window.el && window.el.markerColor) {
            window.el.markerColor.value = settings.markerColor || 'red';
        }
    }

    /**
     * Setup settings event listeners
     */
    function setupSettingsEventListeners() {
        if (!window.el) return;

        // Sound setting
        if (window.el.settingsSound) {
            window.el.settingsSound.addEventListener('change', function() {
                currentSettings.sound = this.checked;
                saveSettings(currentSettings);
            });
        }

        // Vibration setting
        if (window.el.settingsVibrate) {
            window.el.settingsVibrate.addEventListener('change', function() {
                currentSettings.vibrate = this.checked;
                saveSettings(currentSettings);
            });
        }

        // Background location setting
        if (window.el.settingsBackgroundLocation) {
            window.el.settingsBackgroundLocation.addEventListener('change', function() {
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
        if (window.el.settingsBackgroundNotifications) {
            window.el.settingsBackgroundNotifications.addEventListener('change', function() {
                currentSettings.backgroundNotifications = this.checked;
                saveSettings(currentSettings);
            });
        }

        // Theme setting
        if (window.el.settingsTheme) {
            window.el.settingsTheme.addEventListener('change', function() {
                currentSettings.theme = this.value;
                saveSettings(currentSettings);
                applySettings(currentSettings);
            });
        }

        // Marker color setting
        if (window.el.markerColor) {
            window.el.markerColor.addEventListener('change', function() {
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
