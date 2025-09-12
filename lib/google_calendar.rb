require 'google/apis/calendar_v3'
require 'googleauth'

class GoogleCalendar
  def initialize(access_token)
    @service = Google::Apis::CalendarV3::CalendarService.new
    @service.authorization = Google::Auth::UserRefreshCredentials.new(
      access_token: access_token
    )
  end

  def today_events_with_location
    today = Date.today
    time_min = Time.new(today.year, today.month, today.day, 0, 0, 0).iso8601
    time_max = Time.new(today.year, today.month, today.day, 23, 59, 59).iso8601

    begin
      result = @service.list_events(
        'primary',
        max_results: 50,
        single_events: true,
        order_by: 'startTime',
        time_min: time_min,
        time_max: time_max
      )

      events = result.items || []
      
      # Filter events that have location information
      events_with_location = events.select { |event| event.location }
      
      # Convert to hash format similar to the original API
      events_with_location.map do |event|
        {
          id: event.id,
          summary: event.summary,
          location: event.location,
          start: format_datetime(event.start),
          end: format_datetime(event.end),
          description: event.description
        }
      end
    rescue Google::Apis::Error => e
      puts "Error fetching calendar events: #{e.message}"
      []
    end
  end

  private

  def format_datetime(datetime_obj)
    if datetime_obj.date_time
      { dateTime: datetime_obj.date_time.iso8601 }
    elsif datetime_obj.date
      { date: datetime_obj.date.to_s }
    else
      {}
    end
  end
end