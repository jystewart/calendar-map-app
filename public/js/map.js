let map;
let markers = [];
let currentDate = new Date();

function getDateFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    
    if (dateParam) {
        try {
            const date = new Date(dateParam + 'T00:00:00');
            // Check if date is valid
            if (!isNaN(date.getTime())) {
                return date;
            }
        } catch (e) {
            console.warn('Invalid date parameter:', dateParam);
        }
    }
    
    return new Date(); // Default to today
}

function updateUrl(date, pushState = true) {
    const dateStr = date.toISOString().split('T')[0];
    const url = new URL(window.location);
    url.searchParams.set('date', dateStr);
    
    if (pushState) {
        window.history.pushState({ date: dateStr }, '', url);
    } else {
        window.history.replaceState({ date: dateStr }, '', url);
    }
}

async function loadEventsForDate(date) {
    try {
        showLoading();
        
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        const response = await fetch(`/api/calendar/events?date=${dateStr}`);
        
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
        
        const result = await geocodeEvents(events);
        const { allEvents, geocodedEvents } = result;
        
        displayEventsList(allEvents);
        
        if (geocodedEvents.length > 0) {
            createMap(geocodedEvents);
        } else {
            showMapMessage('No events could be mapped');
        }
        
    } catch (error) {
        console.error('Error loading events:', error);
        showError('An error occurred while loading events');
    }
}

async function initializeMap() {
    loadEventsForDate(currentDate);
}

async function geocodeEvents(events) {
    const allEvents = [];
    const geocodedEvents = [];
    
    for (const event of events) {
        const eventWithStatus = { ...event, isGeocoded: false };
        
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            const response = await fetch('/api/geocode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({ address: event.location })
            });
            
            if (response.ok) {
                const locationData = await response.json();
                const geocodedEvent = {
                    ...eventWithStatus,
                    lat: locationData.lat,
                    lng: locationData.lng,
                    formattedAddress: locationData.formattedAddress,
                    isGeocoded: true
                };
                
                allEvents.push(geocodedEvent);
                geocodedEvents.push(geocodedEvent);
            } else {
                allEvents.push(eventWithStatus);
            }
        } catch (error) {
            console.error(`Failed to geocode ${event.location}:`, error);
            allEvents.push(eventWithStatus);
        }
    }
    
    return { allEvents, geocodedEvents };
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

function displayEventsList(events) {
    const eventsListContainer = document.getElementById('events-list');
    if (!eventsListContainer) return;
    
    const eventsHtml = events.map(event => `
        <div class="event-item p-4 border border-gray-200 rounded-lg mb-3">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <h3 class="font-semibold text-lg">${event.summary}</h3>
                    <p class="text-sm text-gray-600 mb-1">${formatTime(event)}</p>
                    <div class="flex items-center">
                        <span class="text-sm text-gray-700">${event.location}</span>
                        ${event.isGeocoded 
                            ? '<span class="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">📍 On Map</span>' 
                            : '<span class="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">📍 Location Only</span>'
                        }
                    </div>
                    ${event.description ? `<p class="text-sm text-gray-600 mt-2">${event.description}</p>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    
    eventsListContainer.innerHTML = eventsHtml;
    eventsListContainer.classList.remove('hidden');
}

function showMapMessage(message) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('map-container').innerHTML = `<div class="flex items-center justify-center h-64 text-gray-500">${message}</div>`;
    document.getElementById('map-container').classList.remove('hidden');
}

function showLoading() {
    document.getElementById('events-list').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('no-events').classList.add('hidden');
    document.getElementById('map-container').classList.add('hidden');
    document.getElementById('loading').classList.remove('hidden');
}

function showNoEvents() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('events-list').classList.add('hidden');
    document.getElementById('map-container').classList.add('hidden');
    document.getElementById('no-events').classList.remove('hidden');
}

function updateDateDisplay(date) {
    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('selected-date-display').textContent = dateStr;
    document.getElementById('date-picker').value = date.toISOString().split('T')[0];
}

function changeDate(days) {
    currentDate.setDate(currentDate.getDate() + days);
    updateDateDisplay(currentDate);
    updateUrl(currentDate);
    loadEventsForDate(currentDate);
}

function goToToday() {
    currentDate = new Date();
    updateDateDisplay(currentDate);
    updateUrl(currentDate);
    loadEventsForDate(currentDate);
}

function setDate(date) {
    currentDate = new Date(date);
    updateDateDisplay(currentDate);
    updateUrl(currentDate);
    loadEventsForDate(currentDate);
}

function setupDateControls() {
    // Initialize from URL or default to today
    currentDate = getDateFromUrl();
    updateDateDisplay(currentDate);
    // Set initial URL state without pushing to history
    updateUrl(currentDate, false);
    
    // Previous day button
    document.getElementById('prev-day').addEventListener('click', () => {
        changeDate(-1);
    });
    
    // Next day button
    document.getElementById('next-day').addEventListener('click', () => {
        changeDate(1);
    });
    
    // Today button
    document.getElementById('today-btn').addEventListener('click', () => {
        goToToday();
    });
    
    // Date picker change
    document.getElementById('date-picker').addEventListener('change', (e) => {
        setDate(e.target.value + 'T00:00:00');
    });
}