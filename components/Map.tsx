import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface CalendarEvent {
  id: string;
  summary: string;
  location: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  description?: string;
}

interface GeocodedEvent extends CalendarEvent {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export default function Map() {
  const [events, setEvents] = useState<GeocodedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEventsAndGeocode();
  }, []);

  const fetchEventsAndGeocode = async () => {
    try {
      setLoading(true);
      
      // Fetch calendar events
      const eventsResponse = await fetch('/api/calendar/events');
      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const { events: calendarEvents } = await eventsResponse.json();
      
      // Geocode each event location
      const geocodedEvents: GeocodedEvent[] = [];
      
      for (const event of calendarEvents) {
        try {
          const geocodeResponse = await fetch('/api/geocode', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address: event.location }),
          });
          
          if (geocodeResponse.ok) {
            const locationData = await geocodeResponse.json();
            geocodedEvents.push({
              ...event,
              lat: locationData.lat,
              lng: locationData.lng,
              formattedAddress: locationData.formattedAddress,
            });
          }
        } catch (err) {
          console.error(`Failed to geocode ${event.location}:`, err);
        }
      }
      
      setEvents(geocodedEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (event: CalendarEvent) => {
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;
    
    if (event.start.dateTime) {
      const startTime = new Date(start!).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const endTime = new Date(end!).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${startTime} - ${endTime}`;
    } else {
      return 'All day';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">No events with locations found for today</div>
      </div>
    );
  }

  // Calculate center point of all events
  const centerLat = events.reduce((sum, event) => sum + event.lat, 0) / events.length;
  const centerLng = events.reduce((sum, event) => sum + event.lng, 0) / events.length;

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden border">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {events.map((event) => (
          <Marker key={event.id} position={[event.lat, event.lng]}>
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-lg mb-2">{event.summary}</h3>
                <p className="text-sm text-gray-600 mb-1">{formatTime(event)}</p>
                <p className="text-sm mb-2">{event.formattedAddress}</p>
                {event.description && (
                  <p className="text-sm text-gray-700">{event.description}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}