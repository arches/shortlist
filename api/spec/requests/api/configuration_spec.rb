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
  def with_maps_key(key)
    was = ENV["SHORTLIST_GOOGLE_MAPS_API_KEY"]
    ENV["SHORTLIST_GOOGLE_MAPS_API_KEY"] = key

    yield
  ensure
    ENV["SHORTLIST_GOOGLE_MAPS_API_KEY"] = was
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

  it "carries the Maps key the environment is configured with" do
    with_maps_key("a-maps-key") { get_the_configuration }

    expect(response.parsed_body).to eq("google_maps_api_key" => "a-maps-key")
  end

  # shortlist.stack.md keeps the Places key server-side: called by the API,
  # never by the browser. Two keys, two exposures, and this is the endpoint
  # where confusing them would hand the wrong one out.
  it "carries nothing else, and in particular not the Places key" do
    get_the_configuration

    expect(response.parsed_body.keys).to eq([ "google_maps_api_key" ])
    expect(response.body).not_to include(ENV.fetch("SHORTLIST_GOOGLE_PLACES_API_KEY"))
  end
end
