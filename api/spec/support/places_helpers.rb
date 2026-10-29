# Stubbing the two Google Places calls the sequence diagram draws. The shapes
# are Places API (New): a POST for Autocomplete and a GET for Place Details.
module PlacesHelpers
  AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete".freeze

  def stub_autocomplete(suggestions)
    stub_request(:post, AUTOCOMPLETE_URL).to_return(
      status: 200,
      headers: { "Content-Type" => "application/json" },
      body: {
        suggestions: suggestions.map do |google_place_id, description|
          { placePrediction: { placeId: google_place_id, text: { text: description } } }
        end
      }.to_json
    )
  end

  def stub_place_details(google_place_id, body)
    stub_request(:get, "https://places.googleapis.com/v1/places/#{google_place_id}").to_return(
      status: 200,
      headers: { "Content-Type" => "application/json" },
      body: body.to_json
    )
  end

  # One Place Details response, in the shape the API actually answers with.
  # Google sends the coordinates as a location object, which is absent for a
  # Place it has no point for.
  def place_details_body(google_place_id:, name:, components: [], cuisine: nil, location: nil)
    {
      id: google_place_id,
      displayName: { text: name, languageCode: "en" },
      addressComponents: components,
      primaryTypeDisplayName: cuisine.nil? ? nil : { text: cuisine },
      location: location
    }.compact
  end

  def place_location(latitude, longitude)
    { latitude: latitude, longitude: longitude }
  end

  def address_component(long, short, *types)
    { longText: long, shortText: short, types: types }
  end
end

RSpec.configure { |config| config.include PlacesHelpers }
