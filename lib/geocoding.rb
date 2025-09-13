require 'httparty'

class GeocodingService
  include HTTParty
  base_uri 'https://maps.googleapis.com/maps/api'

  def initialize
    @api_key = ENV['GOOGLE_MAPS_API_KEY']
    raise 'GOOGLE_MAPS_API_KEY environment variable is required' unless @api_key
    
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

    # Check for mapped locations first
    mapped_result = check_location_mappings(address)
    return mapped_result if mapped_result

    response = self.class.get('/geocode/json', {
      query: {
        address: address,
        key: @api_key
      }
    })

    if response.success? && response['status'] == 'OK' && !response['results'].empty?
      result = response['results'].first
      location = result['geometry']['location']
      
      {
        lat: location['lat'],
        lng: location['lng'],
        formattedAddress: result['formatted_address']
      }
    else
      puts "Geocoding failed for address '#{address}': #{response['status']}"
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