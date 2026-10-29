require "rails_helper"

# Derived from managing-my-list.scenarios.md, its three add paths, and the
# sequence diagram that routes them. Background: I am signed in as the owner of
# my list.
RSpec.describe "POST /api/list/restaurants" do
  let(:owner) { create(:user, email: "sam.reed@fastmail.com") }

  def add(google_place_id, headers = headers_for(owner))
    post "/api/list/restaurants",
      params: { restaurant: { google_place_id: google_place_id } },
      headers: headers,
      as: :json
  end

  def stub_tacos_el_bronco
    stub_place_details(
      "ChIJTacos",
      place_details_body(
        google_place_id: "ChIJTacos",
        name: "Tacos El Bronco",
        cuisine: "Mexican restaurant",
        components: [
          address_component("4324", "4324", "street_number"),
          address_component("4th Avenue", "4th Ave", "route"),
          address_component("Brooklyn", "Brooklyn", "locality"),
          address_component("New York", "NY", "administrative_area_level_1")
        ]
      )
    )
  end

  # Scenario: Adding new restaurant
  describe "a Place that is new to Shortlist" do
    before { stub_tacos_el_bronco }

    it "puts it on my list with its address and cuisine" do
      add("ChIJTacos")

      expect(response).to have_http_status(:created)
      expect(response.parsed_body).to include(
        "name" => "Tacos El Bronco",
        "cuisine" => "Mexican restaurant",
        "address_line_1" => "4324 4th Avenue",
        "city" => "Brooklyn",
        "state" => "NY"
      )
    end

    it "does not read as visited, and has no experiences" do
      add("ChIJTacos")

      expect(response.parsed_body["visited"]).to be(false)
      expect(response.parsed_body["experience_count"]).to eq(0)
    end

    it "creates the Restaurant and the List item that puts it on my list" do
      expect { add("ChIJTacos") }
        .to change(Restaurant, :count).by(1)
        .and change(ListItem, :count).by(1)

      expect(owner.restaurants.sole.google_place_id).to eq("ChIJTacos")
    end

    it "records when it went on my list" do
      freeze_time do
        add("ChIJTacos")

        expect(owner.lists.sole.list_items.sole.added_at).to eq(Time.current)
      end
    end
  end

  # Scenario: Adding a restaurant that exists in the system but not on my list
  describe "a Place already in the system" do
    let!(:existing) do
      create(:restaurant, on_the_list_of: create(:user),
        google_place_id: "ChIJTacos", name: "Tacos El Bronco")
    end

    it "puts it on my list without creating a second Restaurant" do
      expect { add("ChIJTacos") }.to change(ListItem, :count).by(1)

      expect(Restaurant.count).to eq(1)
      expect(response).to have_http_status(:created)
      expect(owner.restaurants.sole).to eq(existing)
    end

    # Only a Place new to Shortlist costs a Place Details call, which is the
    # one ADR 0001 says we eventually pay for.
    it "does not ask Google for details it already has" do
      add("ChIJTacos")

      expect(a_request(:get, //)).not_to have_been_made
    end

    it "does not read as visited on mine, whatever the other owner has done" do
      create(:experience, restaurant: existing, user: existing.list_items.sole.list.user)

      add("ChIJTacos")

      expect(response.parsed_body["visited"]).to be(false)
      expect(response.parsed_body["experience_count"]).to eq(0)
    end
  end

  # Scenario: Adding a restaurant that is already on my list
  describe "a Place already on my list" do
    before do
      create(:restaurant, on_the_list_of: owner,
        google_place_id: "ChIJJoes", name: "Joe's Pizza")
    end

    it "is rejected as already on my list" do
      add("ChIJJoes")

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"].values.flatten.join)
        .to include("already on your list")
    end

    it "leaves my list showing one Joe's Pizza" do
      expect { add("ChIJJoes") }.not_to change(ListItem, :count)

      expect(owner.restaurants.pluck(:name)).to eq([ "Joe's Pizza" ])
    end
  end

  describe "with no Place picked" do
    it "is rejected, and adds nothing" do
      expect { add("") }.not_to change(ListItem, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(a_request(:get, //)).not_to have_been_made
    end
  end

  describe "when Google cannot be reached" do
    it "reports it, and adds nothing" do
      stub_request(:get, "https://places.googleapis.com/v1/places/ChIJTacos").to_timeout

      expect { add("ChIJTacos") }.not_to change(Restaurant, :count)

      expect(response).to have_http_status(:bad_gateway)
    end
  end

  # Scenario: Managing my list while signed out
  describe "when my session has ended" do
    it "asks me to sign in, and adds nothing" do
      expect { add("ChIJTacos", {}) }.not_to change(ListItem, :count)

      expect(response).to have_http_status(:unauthorized)
      expect(a_request(:get, //)).not_to have_been_made
    end
  end
end
