require 'sinatra'
require 'sinatra/reloader' if development?
require 'omniauth'
require 'omniauth-google-oauth2'
require 'dotenv/load'
require 'json'
require 'securerandom'
require_relative 'lib/google_calendar'
require_relative 'lib/geocoding'

# Configure session
use Rack::Session::Cookie, 
  key: 'calendar_map_session',
  secret: ENV['SESSION_SECRET'] || 'your_secret_key_change_in_production'

# Configure CSRF protection
use Rack::Protection::AuthenticityToken, token: proc { |req| req.env['HTTP_X_CSRF_TOKEN'] || req.params['authenticity_token'] }

# Configure Omniauth
OmniAuth.config.allowed_request_methods = %i[post]
use OmniAuth::Builder do
  provider :google_oauth2,
    ENV['GOOGLE_CLIENT_ID'],
    ENV['GOOGLE_CLIENT_SECRET'],
    {
      scope: 'email profile https://www.googleapis.com/auth/calendar.readonly',
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
  
  def csrf_token
    Rack::Protection::AuthenticityToken.token(session)
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
    # Get date from query parameter or default to today
    date_param = params['date']
    target_date = date_param ? Date.parse(date_param) : Date.today
    
    calendar_service = GoogleCalendar.new(current_user[:access_token])
    events = calendar_service.events_for_date_with_location(target_date)
    { events: events }.to_json
  rescue => e
    puts "Calendar API Error: #{e.class} - #{e.message}"
    puts e.backtrace.join("\n") if e.backtrace
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