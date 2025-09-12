let map;
let markers = [];

async function initializeMap() {
    try {
        const response = await fetch('/api/calendar/events');
        
        if (!response.ok) {
            showError('Failed to fetch calendar events');
            return;
        }
        
        const data = await response.json();
        const events = data.events || [];
        
        if (events.length === 0) {
            showNoEvents();
            return;
        }
        
        const geocodedEvents = await geocodeEvents(events);
        
        if (geocodedEvents.length === 0) {
            showNoEvents();
            return;
        }
        
        createMap(geocodedEvents);
        
    } catch (error) {
        console.error('Error initializing map:', error);
        showError('An error occurred while loading the map');
    }
}

async function geocodeEvents(events) {
    const geocodedEvents = [];
    
    for (const event of events) {
        try {
            const response = await fetch('/api/geocode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ address: event.location })
            });
            
            if (response.ok) {
                const locationData = await response.json();
                geocodedEvents.push({
                    ...event,
                    lat: locationData.lat,
                    lng: locationData.lng,
                    formattedAddress: locationData.formattedAddress
                });
            }
        } catch (error) {
            console.error(`Failed to geocode ${event.location}:`, error);
        }
    }
    
    return geocodedEvents;
}

function createMap(events) {
    // Calculate center point of all events
    const centerLat = events.reduce((sum, event) => sum + event.lat, 0) / events.length;
    const centerLng = events.reduce((sum, event) => sum + event.lng, 0) / events.length;
    
    // Initialize map
    map = L.map('map').setView([centerLat, centerLng], 12);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add markers for each event
    events.forEach(event => {
        const marker = L.marker([event.lat, event.lng]).addTo(map);
        
        const popupContent = `
            <div class="p-2">
                <h3 class="font-bold text-lg mb-2">${event.summary}</h3>
                <p class="text-sm text-gray-600 mb-1">${formatTime(event)}</p>
                <p class="text-sm mb-2">${event.formattedAddress}</p>
                ${event.description ? `<p class="text-sm text-gray-700">${event.description}</p>` : ''}
            </div>
        `;
        
        marker.bindPopup(popupContent);
        markers.push(marker);
    });
    
    showMap();
}

function formatTime(event) {
    if (event.start.dateTime) {
        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);
        
        const startTime = start.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        const endTime = end.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        return `${startTime} - ${endTime}`;
    } else {
        return 'All day';
    }
}

function showMap() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('no-events').classList.add('hidden');
    document.getElementById('map-container').classList.remove('hidden');
}

function showError(message) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('map-container').classList.add('hidden');
    document.getElementById('no-events').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('error').innerHTML = `<div class="text-red-600">Error: ${message}</div>`;
}

function showNoEvents() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('map-container').classList.add('hidden');
    document.getElementById('no-events').classList.remove('hidden');
}