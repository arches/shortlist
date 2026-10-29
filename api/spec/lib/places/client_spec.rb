require "rails_helper"

# Derived from shortlist.stack.md (Google Places API (New), Autocomplete and
# Place Details, called by the API with a server-side key) and from the two
# calls managing-my-list.adding-a-restaurant.sequence.d2 draws.
#
# The mapping onto shortlist.data.md's attribute table is an assumption — see
# ASSUMPTIONS.md, "What Place Details maps onto".
RSpec.describe Places::Client do
  subject(:client) { described_class.new(api_key: "a-key") }

  describe "suggestions" do
    it "returns the place id and the description for each one" do
      stub_autocomplete([
        [ "ChIJTacos", "Tacos El Bronco, 4324 4th Ave, Brooklyn, NY" ],
        [ "ChIJTacos2", "Tacos El Bronco, 379 Lawton St, Brooklyn, NY" ]
      ])

      expect(client.suggestions("Tacos El Bronco")).to eq([
        Places::Suggestion.new(
          google_place_id: "ChIJTacos",
          description: "Tacos El Bronco, 4324 4th Ave, Brooklyn, NY"
        ),
        Places::Suggestion.new(
          google_place_id: "ChIJTacos2",
          description: "Tacos El Bronco, 379 Lawton St, Brooklyn, NY"
        )
      ])
    end

    it "sends the typed text to Autocomplete under the server-side key" do
      stub_autocomplete([])

      client.suggestions("  Lilia  ")

      expect(
        a_request(:post, Places::Client::HOST + Places::Client::AUTOCOMPLETE_PATH)
          .with(headers: { "X-Goog-Api-Key" => "a-key" }, body: { input: "Lilia" }.to_json)
      ).to have_been_made
    end

    # The owner is part-way through typing, so this is the ordinary state.
    it "asks Google nothing for a blank query" do
      expect(client.suggestions("   ")).to eq([])
      expect(a_request(:post, //)).not_to have_been_made
    end

    it "drops a suggestion that carries no place id" do
      stub_request(:post, Places::Client::HOST + Places::Client::AUTOCOMPLETE_PATH).to_return(
        status: 200,
        headers: { "Content-Type" => "application/json" },
        body: { suggestions: [ { queryPrediction: { text: { text: "pizza" } } } ] }.to_json
      )

      expect(client.suggestions("pizza")).to eq([])
    end
  end

  describe "details" do
    def details_for(components: [], cuisine: nil, name: "Tacos El Bronco", location: nil)
      stub_place_details(
        "ChIJTacos",
        place_details_body(
          google_place_id: "ChIJTacos", name: name, components: components,
          cuisine: cuisine, location: location
        )
      )

      client.details("ChIJTacos")
    end

    it "maps the name and the cuisine" do
      place = details_for(cuisine: "Mexican restaurant")

      expect(place.google_place_id).to eq("ChIJTacos")
      expect(place.name).to eq("Tacos El Bronco")
      expect(place.cuisine).to eq("Mexican restaurant")
    end

    it "maps the six address fields" do
      place = details_for(components: [
        address_component("4324", "4324", "street_number"),
        address_component("4th Avenue", "4th Ave", "route"),
        address_component("Suite 2", "Suite 2", "subpremise"),
        address_component("Brooklyn", "Brooklyn", "locality"),
        address_component("New York", "NY", "administrative_area_level_1"),
        address_component("11232", "11232", "postal_code"),
        address_component("United States", "US", "country")
      ])

      expect(place).to have_attributes(
        address_line_1: "4324 4th Avenue",
        address_line_2: "Suite 2",
        city: "Brooklyn",
        state: "NY",
        postal_code: "11232",
        country: "United States"
      )
    end

    it "leaves every address field absent when Google sends no components" do
      place = details_for

      expect(place).to have_attributes(
        address_line_1: nil, address_line_2: nil, city: nil,
        state: nil, postal_code: nil, country: nil
      )
    end

    it "falls back to postal_town where there is no locality" do
      place = details_for(components: [ address_component("Bedford", "Bedford", "postal_town") ])

      expect(place.city).to eq("Bedford")
    end

    it "leaves cuisine absent when the Place has no primary type" do
      expect(details_for.cuisine).to be_nil
    end

    # shortlist.data.md gained latitude and longitude for the map in
    # seeing-my-list-on-a-map.scenarios.md. Google sends them as one location
    # object, which the attribute table splits into two.
    it "maps the coordinates" do
      place = details_for(location: place_location(40.641234, -74.008765))

      expect(place).to have_attributes(latitude: 40.641234, longitude: -74.008765)
    end

    it "leaves both coordinates absent when Google sends no location" do
      expect(details_for).to have_attributes(latitude: nil, longitude: nil)
    end

    it "asks only for the fields Shortlist stores" do
      details_for

      expect(
        a_request(:get, "https://places.googleapis.com/v1/places/ChIJTacos").with(
          headers: {
            "X-Goog-Api-Key" => "a-key",
            "X-Goog-FieldMask" => Places::Client::DETAILS_FIELDS
          }
        )
      ).to have_been_made
    end

    it "refuses a blank place id without asking Google" do
      expect { client.details("  ") }.to raise_error(Places::Error)
      expect(a_request(:get, //)).not_to have_been_made
    end
  end

  # Nothing downstream can tell the causes apart or would do anything different
  # about them, so they arrive as one.
  describe "when Google does not answer with a result" do
    it "raises for a refusal" do
      stub_request(:get, "https://places.googleapis.com/v1/places/ChIJTacos").to_return(status: 403)

      expect { client.details("ChIJTacos") }.to raise_error(Places::Error)
    end

    it "raises for a body that is not JSON" do
      stub_request(:post, Places::Client::HOST + Places::Client::AUTOCOMPLETE_PATH)
        .to_return(status: 200, body: "<html>no</html>")

      expect { client.suggestions("Lilia") }.to raise_error(Places::Error)
    end

    it "raises when Google cannot be reached at all" do
      stub_request(:post, Places::Client::HOST + Places::Client::AUTOCOMPLETE_PATH)
        .to_timeout

      expect { client.suggestions("Lilia") }.to raise_error(Places::Error)
    end
  end
end
