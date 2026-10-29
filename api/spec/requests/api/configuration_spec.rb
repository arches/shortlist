require "rails_helper"

# Derived from shortlist.principles.md, "Frontend env vars are injected": the
# frontend bundle carries no configuration, and anything the frontend cannot
# infer is served by the API, unauthenticated, since the frontend needs it
# before anybody has signed in.
#
# The one value that qualifies is the Google Maps browser key. shortlist.stack.md
# put Maps on the frontend and the Maps JS API runs in the browser, so unlike the
# Places key this one has to reach it.
RSpec.describe "GET /api/configuration" do
  def get_the_configuration(headers = {})
    get "/api/configuration", headers: headers, as: :json
  end

  # The container carries whatever the developer's own .env holds, so an example
  # about the value says which variable it came from rather than trusting the
  # environment it happens to run in.
  VARIABLES = %w[
    SHORTLIST_GOOGLE_MAPS_API_KEY
    SHORTLIST_GOOGLE_MAPS_MAP_ID
    SHORTLIST_GOOGLE_PLACES_API_KEY
  ].freeze

  # The container carries whatever the developer's own .env holds, so an example
  # about these values says what they are rather than trusting the environment
  # it happens to run in. The Places key is set here too: an example about the
  # two keys being kept apart cannot be run against a .env that has given them
  # the same value.
  def with_configuration(maps_key:, map_id:, places_key:)
    was = ENV.values_at(*VARIABLES)
    VARIABLES.zip([ maps_key, map_id, places_key ]).each { |name, value| ENV[name] = value }

    yield
  ensure
    VARIABLES.zip(was).each { |name, value| ENV[name] = value }
  end

  # "unauthenticated, since the frontend needs it before anybody has signed in"
  # — the sign-in screen comes out of the same bundle as the list.
  it "answers with no access token at all" do
    get_the_configuration

    expect(response).to have_http_status(:ok)
  end

  it "answers the same once I am signed in" do
    get_the_configuration(headers_for(create(:user)))

    expect(response).to have_http_status(:ok)
  end

  # Both values are Cloud-side configuration the browser cannot infer: the key
  # authorizes the Maps JS API, and the Map ID is what it insists on before it
  # will draw an advanced marker.
  it "carries the Maps configuration the environment is set up with" do
    with_configuration(maps_key: "a-maps-key", map_id: "a-map-id", places_key: "a-places-key") do
      get_the_configuration
    end

    expect(response.parsed_body).to eq(
      "google_maps_api_key" => "a-maps-key",
      "google_maps_map_id" => "a-map-id"
    )
  end

  # shortlist.stack.md keeps the Places key server-side: called by the API,
  # never by the browser. Two keys, two exposures, and this is the endpoint
  # where confusing them would hand the wrong one out.
  it "carries nothing else, and in particular not the Places key" do
    with_configuration(maps_key: "a-maps-key", map_id: "a-map-id", places_key: "a-places-key") do
      get_the_configuration
    end

    expect(response.parsed_body.keys).to eq([ "google_maps_api_key", "google_maps_map_id" ])
    expect(response.body).not_to include("a-places-key")
  end
end
