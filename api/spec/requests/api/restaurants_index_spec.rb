require "rails_helper"

# Derived from managing-my-list.scenarios.md and the wireframe's list screen:
# each card reads a name, a cuisine, whether it is visited, and how many
# experiences it has.
RSpec.describe "GET /api/list/restaurants" do
  let(:owner) { create(:user, email: "sam.reed@fastmail.com") }

  def get_the_list(headers = headers_for(owner))
    get "/api/list/restaurants", headers: headers, as: :json
  end

  describe "when I am signed in" do
    it "opens my list" do
      create(:restaurant, on_the_list_of: owner, name: "Lilia")

      get_the_list

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.map { |r| r["name"] }).to eq([ "Lilia" ])
    end

    it "is empty before anything is on it" do
      get_the_list

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq([])
    end

    it "carries what the card shows for a restaurant only heard the name of" do
      create(:restaurant, on_the_list_of: owner, name: "Lilia", cuisine: "Italian")

      get_the_list

      expect(response.parsed_body.sole).to include(
        "name" => "Lilia",
        "cuisine" => "Italian",
        "visited" => false,
        "experience_count" => 0
      )
    end

    it "reads as visited, with a count, once it has experiences" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "Tacos El Bronco", cuisine: "Mexican")
      create_list(:experience, 2, restaurant: restaurant, user: owner)

      get_the_list

      expect(response.parsed_body.sole).to include(
        "cuisine" => "Mexican",
        "visited" => true,
        "experience_count" => 2
      )
    end

    it "carries every detail Google sent back" do
      create(:restaurant, :with_everything, on_the_list_of: owner)

      get_the_list

      expect(response.parsed_body.sole).to include(
        "name" => "Tacos El Bronco",
        "cuisine" => "Mexican",
        "address_line_1" => "4324 4th Ave",
        "address_line_2" => "Suite 2",
        "city" => "Brooklyn",
        "state" => "NY",
        "postal_code" => "11232",
        "country" => "USA"
      )
    end

    # seeing-my-list-on-a-map.scenarios.md: the map needs a point per
    # restaurant, and the pair travels as numbers rather than as the strings a
    # decimal column would otherwise serialize to.
    it "carries the coordinates as numbers" do
      create(:restaurant, :located, on_the_list_of: owner)

      get_the_list

      expect(response.parsed_body.sole).to include(
        "latitude" => 34.090123,
        "longitude" => -118.276543
      )
    end

    it "carries both coordinates absent for a restaurant Google had no point for" do
      create(:restaurant, on_the_list_of: owner, latitude: nil, longitude: nil)

      get_the_list

      expect(response.parsed_body.sole).to include("latitude" => nil, "longitude" => nil)
    end

    # There is nothing on a Restaurant an owner set, so nothing here was ever
    # theirs to correct.
    it "carries no detail an owner could have set" do
      create(:restaurant, :with_everything, on_the_list_of: owner)

      get_the_list

      expect(response.parsed_body.sole.keys)
        .not_to include("url", "google_maps_url", "yelp_url", "specialty", "notes")
    end
  end

  # A Restaurant with no List item of mine is not on my list, whoever else
  # holds it. Taking one off destroys that item, so it drops out of here.
  it "leaves out the restaurants I have taken off my list" do
    create(:restaurant, on_the_list_of: owner, name: "Lilia")
    taken_off = create(:restaurant, on_the_list_of: owner, name: "Joe's Pizza")
    taken_off.list_items.sole.destroy!

    get_the_list

    expect(response.parsed_body.map { |r| r["name"] }).to eq([ "Lilia" ])
  end

  # Scenario: Two owners keeping the same restaurant — nothing connects the two
  # entries, and a list is private to its owner.
  it "shows me only my own restaurants" do
    create(:restaurant, on_the_list_of: owner, name: "Lilia")
    create(:restaurant, on_the_list_of: create(:user), name: "Joe's Pizza")

    get_the_list

    expect(response.parsed_body.map { |r| r["name"] }).to eq([ "Lilia" ])
  end

  # Scenario: Managing my list while signed out
  describe "when my session has ended" do
    it "asks me to sign in" do
      create(:restaurant, on_the_list_of: owner, name: "Lilia")

      get_the_list({})

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]).to eq("Sign in to continue.")
    end

    it "asks me to sign in once my access token has expired" do
      get_the_list(auth_headers(AccessToken.issue(user: owner, at: 16.minutes.ago)))

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
