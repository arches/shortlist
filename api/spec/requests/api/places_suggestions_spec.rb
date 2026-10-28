require "rails_helper"

# Derived from managing-my-list.scenarios.md — "Then I see autocomplete
# suggestions from the Google Places API" — and from the sequence diagram, which
# routes the call through the API so the key stays server-side.
RSpec.describe "GET /api/places/suggestions" do
  let(:owner) { create(:user, email: "sam.reed@fastmail.com") }

  # The query travels in the query string, so no `as: :json` here: that encodes
  # params as a JSON body, and a GET carrying one is sent as a POST.
  def suggestions_for(query, headers = headers_for(owner))
    get "/api/places/suggestions", params: { q: query }, headers: headers
  end

  describe "when I am signed in" do
    it "answers with what Google suggested" do
      stub_autocomplete([ [ "ChIJTacos", "Tacos El Bronco, 4324 4th Ave, Brooklyn, NY" ] ])

      suggestions_for("Tacos El Bronco")

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq([
        {
          "google_place_id" => "ChIJTacos",
          "description" => "Tacos El Bronco, 4324 4th Ave, Brooklyn, NY"
        }
      ])
    end

    it "answers with nothing for a blank query, without asking Google" do
      suggestions_for("")

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq([])
      expect(a_request(:post, //)).not_to have_been_made
    end

    # The browser never holds the key, which is the whole reason this endpoint
    # exists rather than the frontend calling Google itself.
    it "sends the key to Google and never back to the browser" do
      stub_autocomplete([ [ "ChIJTacos", "Tacos El Bronco" ] ])

      suggestions_for("Tacos")

      expect(response.body).not_to include("test-places-key")
    end

    it "reports Google being unavailable rather than failing silently" do
      stub_request(:post, Places::Client::HOST + Places::Client::AUTOCOMPLETE_PATH)
        .to_return(status: 500)

      suggestions_for("Tacos")

      expect(response).to have_http_status(:bad_gateway)
      expect(response.parsed_body["error"]).to be_present
    end
  end

  # Typing is part of adding, and managing my list while signed out is refused.
  describe "when my session has ended" do
    it "asks me to sign in, without asking Google" do
      suggestions_for("Tacos", {})

      expect(response).to have_http_status(:unauthorized)
      expect(a_request(:post, //)).not_to have_been_made
    end
  end
end
