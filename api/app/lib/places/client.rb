require "net/http"

module Places
  # Raised when Google cannot be reached, or answers with something other than
  # a result. Nothing downstream can tell the causes apart or would do anything
  # different about them, so they arrive as one.
  class Error < StandardError; end

  # The one thing that talks to the Google Places API, per shortlist.context.d2
  # and shortlist.stack.md: called by the API, never the browser, and the key is
  # server-side configuration. Net::HTTP is the stack's HTTP client.
  class Client
    HOST = "https://places.googleapis.com".freeze
    AUTOCOMPLETE_PATH = "/v1/places:autocomplete".freeze

    # Only what shortlist.data.md stores. Asking for more would be paid for and
    # thrown away — ADR 0001 notes the free tier is finite.
    DETAILS_FIELDS = "id,displayName,addressComponents,primaryTypeDisplayName,location".freeze

    TIMEOUT_SECONDS = 5

    def initialize(api_key: ENV.fetch("SHORTLIST_GOOGLE_PLACES_API_KEY"))
      @api_key = api_key
    end

    # Autocomplete (New). The owner is part-way through typing, so a blank query
    # is the ordinary state rather than an error, and it asks Google nothing.
    def suggestions(query)
      return [] if query.to_s.strip.empty?

      body = post(AUTOCOMPLETE_PATH, { input: query.to_s.strip })

      Array(body["suggestions"]).filter_map { |suggestion| suggestion_from(suggestion) }
    end

    # Place Details (New), for the one Place the owner picked.
    def details(google_place_id)
      raise Error, "a Place ID is needed" if google_place_id.to_s.strip.empty?

      place_from(get("/v1/places/#{ERB::Util.url_encode(google_place_id)}"))
    end

    private
      attr_reader :api_key

      def suggestion_from(suggestion)
        prediction = suggestion["placePrediction"]
        return nil if prediction.nil?

        google_place_id = prediction["placeId"]
        return nil if google_place_id.to_s.empty?

        Suggestion.new(
          google_place_id: google_place_id,
          description: prediction.dig("text", "text").to_s
        )
      end

      # The mapping from Google's shape onto shortlist.data.md's attribute
      # table. No artifact states it — see ASSUMPTIONS.md, "What Place Details
      # maps onto".
      def place_from(body)
        components = Array(body["addressComponents"])

        Place.new(
          google_place_id: body["id"].to_s,
          name: body.dig("displayName", "text").to_s,
          address_line_1: street_address(components),
          address_line_2: component(components, "subpremise"),
          city: component(components, "locality") ||
            component(components, "postal_town") ||
            component(components, "sublocality_level_1"),
          state: component(components, "administrative_area_level_1", short: true),
          postal_code: component(components, "postal_code"),
          country: component(components, "country"),
          cuisine: body.dig("primaryTypeDisplayName", "text"),
          latitude: body.dig("location", "latitude"),
          longitude: body.dig("location", "longitude")
        )
      end

      def street_address(components)
        line = [ component(components, "street_number"), component(components, "route") ].compact.join(" ")

        line.empty? ? nil : line
      end

      def component(components, type, short: false)
        found = components.find { |component| Array(component["types"]).include?(type) }
        return nil if found.nil?

        value = found[short ? "shortText" : "longText"].to_s

        value.empty? ? nil : value
      end

      def get(path)
        request = Net::HTTP::Get.new(URI.join(HOST, path))
        request["X-Goog-FieldMask"] = DETAILS_FIELDS

        send_request(request)
      end

      def post(path, payload)
        request = Net::HTTP::Post.new(URI.join(HOST, path))
        request["Content-Type"] = "application/json"
        request.body = payload.to_json

        send_request(request)
      end

      def send_request(request)
        request["X-Goog-Api-Key"] = api_key

        uri = request.uri
        response = Net::HTTP.start(
          uri.host, uri.port,
          use_ssl: true, open_timeout: TIMEOUT_SECONDS, read_timeout: TIMEOUT_SECONDS
        ) { |http| http.request(request) }

        raise Error, "Google Places answered #{response.code}" unless response.is_a?(Net::HTTPSuccess)

        JSON.parse(response.body.to_s)
      rescue JSON::ParserError, Timeout::Error, SystemCallError, IOError, OpenSSL::SSL::SSLError => e
        raise Error, "Google Places could not be reached: #{e.class}"
      end
  end
end
