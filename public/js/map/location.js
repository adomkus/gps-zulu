// Location tracking and updates - consolidated from map.js location parts
(function(){
    const perf = window.perf;

    // === LOCATION TRACKING ===
    function startLocationUpdates() {
        if (!('geolocation' in navigator)) {
            perf.log('Geolocation not supported');
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
        };

        // Get initial location
        navigator.geolocation.getCurrentPosition(
            (position) => handleLocationUpdate(position),
            (error) => perf.log(`Initial location error: ${error.message}`),
            options
        );

        // Watch for location changes
        navigator.geolocation.watchPosition(
            (position) => handleLocationUpdate(position),
            (error) => perf.log(`Location watch error: ${error.message}`),
            options
        );

        perf.log('Location updates started');
    }

    // Throttle location updates to prevent spam
    let lastLocationUpdate = 0;
    const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds

    function handleLocationUpdate(position) {
        const now = Date.now();
        const coords = position.coords;
        const state = window.state || {};
        
        // Store last known location
        state.lastKnownLocation = {
            lat: coords.latitude,
            lon: coords.longitude,
            accuracy: coords.accuracy,
            speed: coords.speed,
            timestamp: now
        };

        // Calculate distance moved (if we have previous location)
        if (state.previousLocation) {
            const distance = calculateDistance(
                state.previousLocation.lat,
                state.previousLocation.lon,
                coords.latitude,
                coords.longitude
            );
            state.lastKnownLocation.distanceMoved = distance;
        }

        // Throttle map updates and server updates
        if (now - lastLocationUpdate > LOCATION_UPDATE_INTERVAL) {
            // Update map markers (debounced)
            if (window.MapModule && window.MapModule.renderMapMarkers) {
                setTimeout(() => {
                    window.MapModule.renderMapMarkers();
                }, 100);
            }

            // Send to server via socket
            if (window.socket && window.socket.connected) {
                const locationData = {
                    lat: coords.latitude,
                    lon: coords.longitude,
                    accuracy: coords.accuracy,
                    speed: coords.speed,
                    timestamp: now
                };
                
                window.socket.emit('update location', locationData);
                perf.log(`📍 Location sent to server: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
            }

            lastLocationUpdate = now;
        }

        // Store as previous location for next calculation
        state.previousLocation = {
            lat: coords.latitude,
            lon: coords.longitude,
            timestamp: now
        };
    }

    // === DISTANCE CALCULATION ===
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // === DEBOUNCED LOCATION UPDATE ===
    const debouncedLocationUpdate = perf.debounce((coords) => {
        if (window.socket && window.socket.connected) {
            window.socket.emit('update location', {
                lat: coords.latitude,
                lon: coords.longitude,
                accuracy: coords.accuracy,
                speed: coords.speed,
                timestamp: Date.now()
            });
        }
    }, 2000);

    // === EXPORT ===
    window.LocationModule = {
        startLocationUpdates: startLocationUpdates,
        handleLocationUpdate: handleLocationUpdate,
        calculateDistance: calculateDistance,
        debouncedLocationUpdate: debouncedLocationUpdate
    };
})();
