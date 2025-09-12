require 'sinatra'
require 'sinatra/reloader' if development?
require 'omniauth'
require 'omniauth-google-oauth2'
require 'omniauth-rails_csrf_protection'
require 'dotenv/load'
require 'json'
require_relative 'lib/google_calendar'
require_relative 'lib/geocoding'

# Configure session
use Rack::Session::Cookie, 
  key: 'calendar_map_session',
  secret: ENV['SESSION_SECRET'] || 'your_secret_key_change_in_production'

# Configure Omniauth
use OmniAuth::Builder do
  provider :google_oauth2,
    ENV['GOOGLE_CLIENT_ID'],
    ENV['GOOGLE_CLIENT_SECRET'],
    {
      scope: 'email,profile,https://www.googleapis.com/auth/calendar.readonly',
      access_type: 'offline'
    }
end

# Helper methods
helpers do
  def authenticated?
    !session[:user].nil?
  end

  def current_user
    session[:user]
  end

  def require_authentication!
    redirect '/auth/google_oauth2' unless authenticated?
  end
end

# Routes
get '/' do
  if authenticated?
    erb :index
  else
    erb :login
  end
end

# OAuth callback
get '/auth/google_oauth2/callback' do
  auth = request.env['omniauth.auth']
  
  session[:user] = {
    uid: auth.uid,
    name: auth.info.name,
    email: auth.info.email,
    image: auth.info.image,
    access_token: auth.credentials.token,
    refresh_token: auth.credentials.refresh_token
  }
  
  redirect '/'
end

# OAuth failure
get '/auth/failure' do
  erb :error, locals: { message: 'Authentication failed' }
end

# Logout
get '/logout' do
  session.clear
  redirect '/'
end

# API Routes
get '/api/calendar/events' do
  require_authentication!
  content_type :json
  
  begin
    calendar_service = GoogleCalendar.new(current_user[:access_token])
    events = calendar_service.today_events_with_location
    { events: events }.to_json
  rescue => e
    status 500
    { error: 'Failed to fetch calendar events', message: e.message }.to_json
  end
end

post '/api/geocode' do
  require_authentication!
  content_type :json
  
  request_data = JSON.parse(request.body.read)
  address = request_data['address']
  
  return { error: 'Address is required' }.to_json if address.nil? || address.empty?
  
  begin
    geocoding_service = GeocodingService.new
    result = geocoding_service.geocode(address)
    
    if result
      result.to_json
    else
      status 404
      { error: 'Location not found' }.to_json
    end
  rescue => e
    status 500
    { error: 'Failed to geocode address', message: e.message }.to_json
  end
end

# Error handling
error do
  erb :error, locals: { message: 'Something went wrong!' }
end