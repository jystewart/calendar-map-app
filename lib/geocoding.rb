require 'httparty'

class GeocodingService
  include HTTParty
  base_uri 'https://maps.googleapis.com/maps/api'

  def initialize
    @api_key = ENV['GOOGLE_MAPS_API_KEY']
    raise 'GOOGLE_MAPS_API_KEY environment variable is required' unless @api_key
  end

  def geocode(address)
    return nil if address.nil? || address.empty?

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
end