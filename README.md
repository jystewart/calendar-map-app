# Calendar Map App - Ruby/Sinatra Version

A Ruby/Sinatra implementation of the Calendar Map application that displays today's Google Calendar events on an interactive map.

## Features

- Google OAuth authentication
- Fetches today's calendar events from Google Calendar API
- Geocodes event locations using Google Maps API
- Displays events on an interactive Leaflet map
- Responsive design

## Prerequisites

- Ruby 3.1.0 or higher
- Bundler gem
- Google Cloud Project with Calendar and Maps APIs enabled
- Google OAuth2 credentials

## Setup

1. **Clone and navigate to the Ruby app directory:**
   ```bash
   cd ruby-calendar-map
   ```

2. **Install dependencies:**
   ```bash
   bundle install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your Google credentials:
   - `GOOGLE_CLIENT_ID` - Your Google OAuth2 client ID
   - `GOOGLE_CLIENT_SECRET` - Your Google OAuth2 client secret  
   - `GOOGLE_MAPS_API_KEY` - Your Google Maps API key
   - `SESSION_SECRET` - A random string for session encryption

4. **Google Cloud Setup:**
   - Enable Google Calendar API and Google Maps Geocoding API
   - Create OAuth2 credentials
   - Add `http://localhost:4567/auth/google_oauth2/callback` as an authorized redirect URI

## Running the Application

```bash
# Development mode with auto-reload
bundle exec rerun ruby app.rb

# Or run directly
ruby app.rb
```

The application will be available at `http://localhost:4567`

## File Structure

```
ruby-calendar-map/
├── app.rb                 # Main Sinatra application
├── Gemfile               # Ruby dependencies
├── lib/
│   ├── google_calendar.rb # Google Calendar API integration
│   └── geocoding.rb      # Google Maps Geocoding service
├── views/
│   ├── layout.erb        # HTML layout template
│   ├── login.erb         # Login page
│   ├── index.erb         # Main application page
│   └── error.erb         # Error page
├── public/
│   ├── js/
│   │   └── map.js       # Frontend JavaScript for map functionality
│   └── css/
│       └── styles.css   # Application styling
├── config.ru            # Rack configuration (for deployment)
└── .env                 # Environment variables
```

## API Endpoints

- `GET /` - Main application page (requires authentication)
- `GET /auth/google_oauth2` - Initiate Google OAuth
- `GET /auth/google_oauth2/callback` - OAuth callback
- `GET /logout` - Sign out user
- `GET /api/calendar/events` - Fetch today's calendar events (JSON)
- `POST /api/geocode` - Geocode an address (JSON)

## Deployment

For production deployment, consider:

1. Using a production-grade web server (Puma, Unicorn)
2. Setting up proper session storage (Redis)
3. Configuring HTTPS
4. Setting environment-specific configurations

Example Procfile for Heroku:
```
web: bundle exec puma -t 5:5 -p ${PORT:-3000} -e ${RACK_ENV:-development}
```

## Differences from Next.js Version

- Server-side rendering with ERB templates instead of React components
- Traditional form-based authentication flow instead of NextAuth.js
- Vanilla JavaScript instead of React for frontend interactivity
- Direct API calls instead of React hooks for data fetching
- Sinatra routes instead of Next.js API routes