require 'httparty'

class GeocodingService
  include HTTParty
  base_uri 'https://maps.googleapis.com/maps/api'

  def initialize
    @api_key = ENV['GOOGLE_MAPS_API_KEY']
    raise 'GOOGLE_MAPS_API_KEY environment variable is required' unless @api_key
    
    # In-memory cache for geocoding results
    @geocode_cache = {}
    
    # Pre-geocoded location mappings
    @location_mappings = {
      # PD-2- locations are at High Holborn
      # Coordinates for 262 High Holborn, London, WC1V 7EE
      'PD-2-' => {
        lat: 51.5179,
        lng: -0.1162,
        formattedAddress: '262 High Holborn, London WC1V 7EE, UK'
      }
    }
  end

  def geocode(address)
    return nil if address.nil? || address.empty?

    # Normalize address for cache key (trim whitespace, convert to lowercase)
    cache_key = address.strip.downcase
    
    # Check cache first
    if @geocode_cache.key?(cache_key)
      puts "Cache hit for '#{address}'"
      return @geocode_cache[cache_key]&.dup
    end

    # Check for mapped locations
    mapped_result = check_location_mappings(address)
    if mapped_result
      # Cache the mapped result too
      @geocode_cache[cache_key] = mapped_result.dup
      return mapped_result
    end

    response = self.class.get('/geocode/json', {
      query: {
        address: address,
        key: @api_key
      }
    })

    if response.success? && response['status'] == 'OK' && !response['results'].empty?
      result = response['results'].first
      location = result['geometry']['location']
      
      geocode_result = {
        lat: location['lat'],
        lng: location['lng'],
        formattedAddress: result['formatted_address']
      }
      
      # Cache the successful result
      @geocode_cache[cache_key] = geocode_result.dup
      puts "Cached geocoding result for '#{address}'"
      
      geocode_result
    else
      puts "Geocoding failed for address '#{address}': #{response['status']}"
      # Cache failed results as nil to avoid repeated API calls
      @geocode_cache[cache_key] = nil
      nil
    end
  rescue => e
    puts "Error geocoding address '#{address}': #{e.message}"
    nil
  end

  private

  def check_location_mappings(address)
    @location_mappings.each do |prefix, location_data|
      if address.start_with?(prefix)
        puts "Found mapping for '#{address}' using prefix '#{prefix}'"
        return location_data.dup
      end
    end
    nil
  end
end