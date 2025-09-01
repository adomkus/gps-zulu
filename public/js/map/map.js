// Map functionality - consolidated from map.js
(function(){
    const perf = window.perf;

    let map;
    let userMarkers = new Map();
    let selfMarker = null;

    // === MAP INITIALIZATION ===
    function initMap() {
        if (map) return map;
        
        // Get map container using window.el if available
        const mapContainer = window.el && window.el.mapContainer ? window.el.mapContainer : document.getElementById('map');
        if (!mapContainer) {
            perf.log('❌ Map container not found');
            return null;
        }
        
        // Initialize map
        map = L.map(mapContainer, {
            center: [55.7, 24.3],
            zoom: 7,
            zoomControl: true,
            attributionControl: true
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);

        // Add custom controls
        addMapControls();
        
        perf.log('Map initialized');
        return map;
    }

    function addMapControls() {
        // Add fullscreen control
        const fullscreenControl = L.Control.extend({
            options: {
                position: 'topleft'
            },
            onAdd: function() {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                const button = L.DomUtil.create('a', 'leaflet-control-fullscreen', container);
                button.innerHTML = '⛶';
                button.title = 'Pilnas ekranas';
                button.style.cssText = 'width: 30px; height: 30px; line-height: 30px; text-align: center;';
                
                button.onclick = function() {
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        document.documentElement.requestFullscreen();
                    }
                };
                
                return container;
            }
        });
        
        map.addControl(new fullscreenControl());
    }

    // === MARKER MANAGEMENT ===
    function renderMapMarkers() {
        const state = window.state || {};
        if (!map) return;
        
        // Clear existing markers
        userMarkers.forEach(marker => map.removeLayer(marker));
        userMarkers.clear();
        
        // Add user markers
        state.onlineUsers.forEach((user, userId) => {
            if (user.lat && user.lon && userId !== state.currentUser.id) {
                const marker = createUserMarker(user, userId);
                userMarkers.set(userId, marker);
                marker.addTo(map);
            }
        });
        
        // Add self marker
        if (state.lastKnownLocation && state.lastKnownLocation.lat && state.lastKnownLocation.lon) {
            if (selfMarker) map.removeLayer(selfMarker);
            selfMarker = createSelfMarker(state.lastKnownLocation);
            selfMarker.addTo(map);
        }
        
        perf.log(`🗺️ Rendered ${userMarkers.size} user markers`);
    }

    function createUserMarker(user, userId) {
        const state = window.state || {};
        const userData = state.allUsers.get(userId) || user;
        
        // Standartinis raudonas markeris su viršuje esančiu vardu
        const color = (window.SettingsModule && window.SettingsModule.getSettings()?.markerColor) || 'red';
        // Naudojame CDN spalvotus marker’ius
        const iconUrlMap = {
            red: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            blue: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            green: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            orange: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
            violet: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png'
        };
        const marker = L.marker([user.lat, user.lon], {
            icon: L.icon({
                iconUrl: iconUrlMap[color] || iconUrlMap.red,
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                tooltipAnchor: [12, -28]
            })
        });
        
        marker.bindTooltip(`${userData.username}`, { permanent: true, direction: 'top', offset: [0, -10], className: 'user-name-tooltip', interactive: true });

        // Tooltip click = atidaryti kontekstinį meniu
        marker.on('tooltipopen', (e) => {
            try {
                const tipEl = e.tooltip && e.tooltip.getElement && e.tooltip.getElement();
                if (tipEl) {
                    tipEl.style.cursor = 'pointer';
                    tipEl.onclick = () => {
                        const fullUser = state.allUsers.get(userId) || { id: userId, username: userData.username, is_admin: !!userData.is_admin };
                        const mapRef = getMap();
                        const pt = mapRef && mapRef.latLngToContainerPoint ? mapRef.latLngToContainerPoint(marker.getLatLng()) : null;
                        if (window.ContextMenuUI && pt) {
                            window.ContextMenuUI.showAt(fullUser, { x: pt.x, y: pt.y - 10 });
                        } else if (window.ContextMenuUI) {
                            window.ContextMenuUI.show(fullUser);
                        }
                    };
                }
            } catch(_) {}
        });
        
        // Atidaryti kontekstinį meniu paspaudus ant markerių
        marker.on('click', (ev) => {
            try {
                const fullUser = state.allUsers.get(userId) || { id: userId, username: userData.username, is_admin: !!userData.is_admin };
                const mapRef = getMap();
                const pt = mapRef && mapRef.latLngToContainerPoint ? mapRef.latLngToContainerPoint(ev.latlng) : null;
                if (window.ContextMenuUI && pt) {
                    window.ContextMenuUI.showAt(fullUser, { x: pt.x, y: pt.y });
                } else if (window.ContextMenuUI) {
                    window.ContextMenuUI.show(fullUser);
                }
            } catch(_) {}
        });
        
        return marker;
    }

    function createSelfMarker(location) {
        const color = (window.SettingsModule && window.SettingsModule.getSettings()?.markerColor) || 'red';
        const iconUrlMap = {
            red: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            blue: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            green: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            orange: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
            violet: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png'
        };
        const marker = L.marker([location.lat, location.lon], {
            icon: L.icon({
                iconUrl: iconUrlMap[color] || iconUrlMap.red,
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                tooltipAnchor: [12, -28]
            })
        });
        const username = (window.state && window.state.currentUser && window.state.currentUser.username) ? window.state.currentUser.username : 'Jūs';
        marker.bindTooltip(`${username} (Jūs)`, { permanent: true, direction: 'top', offset: [0, -10], className: 'user-name-tooltip', interactive: false });
        return marker;
    }

    function createMapPopupContent(user) {
        const state = window.state || {};
        const isOnline = state.onlineUsers.has(user.id);
        const location = state.onlineUsers.get(user.id);
        
        let content = `
            <div class="map-popup">
                <div class="popup-header">
                    <strong>${user.username}</strong>
                    ${user.is_admin ? '<span class="admin-badge">Admin</span>' : ''}
                </div>
        `;
        
        if (isOnline && location) {
            content += `
                <div class="popup-status online">🟢 Prisijungęs</div>
                <div class="popup-location">
                    📍 ${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}
                </div>
            `;
        } else {
            content += `<div class="popup-status offline">🔴 Neprisijungęs</div>`;
        }
        
        content += `
                <div class="popup-actions">
                    <button onclick="handleMapPopupAction('chat', ${user.id})">💬 Rašyti</button>
                    <button onclick="handleMapPopupAction('center', ${user.id})">📍 Centruoti</button>
                    <button onclick="handleMapPopupAction('info', ${user.id})">ℹ️ Informacija</button>
                    <button onclick="handleMapPopupAction('follow', ${user.id})">🎯 Sekti</button>
                </div>
            </div>
        `;
        
        return content;
    }

    // === MAP UTILITIES ===
    function updateMapBounds() {
        if (!map) return;
        
        const state = window.state || {};
        const locations = Array.from(state.onlineUsers.values())
            .filter(u => u.lat && u.lon && typeof u.lat === 'number' && typeof u.lon === 'number')
            .map(u => L.latLng(u.lat, u.lon));
        
        if (locations.length > 0) {
            map.fitBounds(L.latLngBounds(locations).pad(0.1));
        } else {
            map.setView([55.7, 24.3], 7);
        }
    }

    function getMap() {
        return map;
    }

    // === EXPORT ===
    window.MapModule = {
        initMap: initMap,
        renderMapMarkers: renderMapMarkers,
        createMapPopupContent: createMapPopupContent,
        updateMapBounds: updateMapBounds,
        getMap: getMap
    };
})();
