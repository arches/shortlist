require "rails_helper"

# Derived from managing-my-list.scenarios.md. Background: I am signed in as the
# owner of my list.
RSpec.describe "POST /api/restaurants" do
  let(:owner) { create(:user, email: "sam.reed@fastmail.com") }

  def add(attributes, headers = headers_for(owner))
    post "/api/restaurants", params: { restaurant: attributes }, headers: headers, as: :json
  end

  # Scenario: Adding a restaurant I have only heard the name of
  describe "with only a name" do
    it "puts it on my list" do
      add(name: "Lilia")

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["name"]).to eq("Lilia")
      expect(owner.restaurants.on_the_list.sole.name).to eq("Lilia")
    end

    it "does not read as visited, and has no experiences" do
      add(name: "Lilia")

      expect(response.parsed_body["visited"]).to be(false)
      expect(response.parsed_body["experience_count"]).to eq(0)
    end

    it "records when it went on the list" do
      freeze_time do
        add(name: "Lilia")

        expect(owner.restaurants.sole.added_at).to eq(Time.current)
      end
    end
  end

  # Scenario: Adding a restaurant with everything I know about it
  describe "with everything I know about it" do
    it "keeps all of those details" do
      add(
        name: "Tacos El Bronco",
        cuisine: "Mexican",
        specialty: "Suadero tacos",
        address_line_1: "4324 4th Ave",
        city: "Brooklyn",
        state: "NY",
        postal_code: "11232",
        url: "https://tacoselbronco.com",
        notes: "Cash only, closes early"
      )

      expect(response).to have_http_status(:created)
      expect(response.parsed_body).to include(
        "name" => "Tacos El Bronco",
        "cuisine" => "Mexican",
        "specialty" => "Suadero tacos",
        "address_line_1" => "4324 4th Ave",
        "city" => "Brooklyn",
        "state" => "NY",
        "postal_code" => "11232",
        "url" => "https://tacoselbronco.com",
        "notes" => "Cash only, closes early"
      )
    end

    it "still does not read as visited" do
      add(name: "Tacos El Bronco", cuisine: "Mexican")

      expect(response.parsed_body["visited"]).to be(false)
    end
  end

  # Scenario: Adding a restaurant that is already on my list
  describe "when it is already on my list" do
    it "is rejected as already on my list" do
      create(:restaurant, user: owner, name: "Joe's Pizza")

      add(name: "Joe's Pizza")

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"]["name"]).to include("Name is already on your list")
    end

    it "leaves my list showing one Joe's Pizza" do
      create(:restaurant, user: owner, name: "Joe's Pizza")

      expect { add(name: "Joe's Pizza") }.not_to change(Restaurant, :count)

      expect(owner.restaurants.on_the_list.count).to eq(1)
    end

    it "is rejected however the name was typed" do
      create(:restaurant, user: owner, name: "Joe's Pizza")

      add(name: "  joe's PIZZA ")

      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  # Scenario: Adding a restaurant with no name
  describe "with no name" do
    it "rejects a name that is only whitespace, and adds nothing" do
      expect { add(name: "   ") }.not_to change(Restaurant, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"]["name"]).to be_present
    end

    it "rejects an absent name, and adds nothing" do
      expect { add(cuisine: "Italian") }.not_to change(Restaurant, :count)

      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  # Scenario Outline: Giving a restaurant a link that is not a web address
  describe "with a link that is not a web address" do
    [
      [ "javascript:alert(1)", "not a web address, and it gets rendered" ],
      [ "data:text/html,<h1>hi</h1>", "same" ],
      [ "mailto:hi@lilianewyork.com", "a web address is what this field means" ]
    ].each do |link, why|
      it "rejects #{link} — #{why}" do
        expect { add(name: "Lilia", url: link) }.not_to change(Restaurant, :count)

        expect(response).to have_http_status(:unprocessable_content)
        expect(response.parsed_body["errors"]["url"]).to be_present
      end
    end

    it "rejects a bad Google Maps link too" do
      add(name: "Lilia", google_maps_url: "javascript:alert(1)")

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"]["google_maps_url"]).to be_present
    end

    it "rejects a bad Yelp link too" do
      add(name: "Lilia", yelp_url: "mailto:hi@lilianewyork.com")

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"]["yelp_url"]).to be_present
    end
  end

  # Scenario: Adding a restaurant I previously took off my list
  describe "when I previously took it off my list" do
    it "puts a new one on my list rather than colliding" do
      create(:restaurant, :removed, user: owner, name: "Joe's Pizza")

      add(name: "Joe's Pizza")

      expect(response).to have_http_status(:created)
      expect(owner.restaurants.on_the_list.sole.name).to eq("Joe's Pizza")
    end

    # What comes back is a new restaurant that happens to share a name — the old
    # experiences do not return with it.
    it "does not read as visited, and has none of the old experiences" do
      taken_off = create(:restaurant, :removed, user: owner, name: "Joe's Pizza")
      create_list(:experience, 2, restaurant: taken_off, user: owner)

      add(name: "Joe's Pizza")

      expect(response.parsed_body["visited"]).to be(false)
      expect(response.parsed_body["experience_count"]).to eq(0)
      expect(response.parsed_body["id"]).not_to eq(taken_off.id)
    end
  end

  # Scenario: Two owners keeping the same restaurant
  describe "when another owner has it on their list" do
    it "puts it on mine too, and nothing connects the two" do
      other = create(:user)
      theirs = create(:restaurant, user: other, name: "Joe's Pizza")

      add(name: "Joe's Pizza")

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["id"]).not_to eq(theirs.id)
      expect(response.parsed_body["visited"]).to be(false)
    end
  end

  # Scenario: Managing my list while signed out
  describe "when my session has ended" do
    it "asks me to sign in, and adds nothing" do
      expect { add({ name: "Bar Primi" }, {}) }.not_to change(Restaurant, :count)

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]).to eq("Sign in to continue.")
    end
  end
end
