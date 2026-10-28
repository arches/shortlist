require "rails_helper"

# Derived from managing-my-list.scenarios.md. Background: I am signed in as the
# owner of my list.
RSpec.describe "PATCH /api/restaurants/:id" do
  let(:owner) { create(:user, email: "sam.reed@fastmail.com") }

  def change_restaurant(restaurant_or_id, attributes, headers = headers_for(owner))
    id = restaurant_or_id.respond_to?(:id) ? restaurant_or_id.id : restaurant_or_id
    patch "/api/restaurants/#{id}",
      params: { restaurant: attributes }, headers: headers, as: :json
  end

  # Scenario: Filling in a detail later
  describe "filling in a detail" do
    it "sets the one detail" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "Lilia", cuisine: nil)

      change_restaurant(restaurant, cuisine: "Italian")

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["cuisine"]).to eq("Italian")
    end

    it "leaves the others alone" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "Lilia",
        cuisine: nil, address_line_1: nil, city: nil, notes: "Book a month ahead")

      change_restaurant(restaurant, cuisine: "Italian")

      expect(response.parsed_body["address_line_1"]).to be_nil
      expect(response.parsed_body["city"]).to be_nil
      expect(response.parsed_body["notes"]).to eq("Book a month ahead")
      expect(response.parsed_body["name"]).to eq("Lilia")
    end
  end

  # Scenario: Clearing a detail. Clearing is a distinct act from leaving a field
  # alone — otherwise a note written by mistake can never be taken back.
  describe "clearing a detail" do
    it "clears the note" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "Lilia", notes: "Book a month ahead")

      change_restaurant(restaurant, notes: nil)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["notes"]).to be_nil
      expect(restaurant.reload.notes).to be_nil
    end

    it "leaves a field alone when it is not mentioned at all" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "Lilia", notes: "Book a month ahead")

      change_restaurant(restaurant, cuisine: "Italian")

      expect(restaurant.reload.notes).to eq("Book a month ahead")
    end

    it "clears a link" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "Lilia", url: "https://lilianewyork.com")

      change_restaurant(restaurant, url: nil)

      expect(response.parsed_body["url"]).to be_nil
    end
  end

  # Scenario: Correcting a restaurant's name. A rename moves the restaurant and
  # its history together; it does not create a second entry.
  describe "correcting a name" do
    it "renames it in place" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "Bar Primi")

      expect { change_restaurant(restaurant, name: "Bar Primi Soho") }.not_to change(Restaurant, :count)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["name"]).to eq("Bar Primi Soho")
      expect(owner.restaurants.map(&:name)).to eq([ "Bar Primi Soho" ])
    end

    it "leaves its experiences unchanged" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "Bar Primi")
      experiences = create_list(:experience, 2, restaurant: restaurant, user: owner)

      change_restaurant(restaurant, name: "Bar Primi Soho")

      expect(restaurant.reload.experiences.map(&:id)).to match_array(experiences.map(&:id))
      expect(response.parsed_body["experience_count"]).to eq(2)
    end

    it "leaves the List item's added_at alone" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "Bar Primi")
      restaurant.list_items.sole.update!(added_at: 2.years.ago)

      change_restaurant(restaurant, name: "Bar Primi Soho")

      expect(restaurant.list_items.sole.reload.added_at).to be_within(1.second).of(2.years.ago)
    end
  end

  describe "renaming" do
    it "lets a restaurant keep its own name" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "Lilia")

      change_restaurant(restaurant, name: "Lilia", cuisine: "Italian")

      expect(response).to have_http_status(:ok)
    end
  end

  describe "changing a detail to something invalid" do
    it "rejects a name that is only whitespace, and changes nothing" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "Lilia")

      change_restaurant(restaurant, name: "   ")

      expect(response).to have_http_status(:unprocessable_content)
      expect(restaurant.reload.name).to eq("Lilia")
    end
  end

  # Scenario Outline: Giving a restaurant a link that is not a web address.
  # Links on a restaurant are rendered as links, so what counts as one is a
  # decision rather than a formality. The outline runs against editing: adding
  # takes a Place ID, so a link only ever arrives here.
  describe "giving it a link that is not a web address" do
    [
      [ "javascript:alert(1)", "not a web address, and it gets rendered" ],
      [ "data:text/html,<h1>hi</h1>", "same" ],
      [ "mailto:hi@lilianewyork.com", "a web address is what this field means" ]
    ].each do |link, why|
      it "rejects #{link} — #{why}" do
        restaurant = create(:restaurant, on_the_list_of: owner, name: "Lilia", url: "https://lilianewyork.com")

        change_restaurant(restaurant, url: link)

        expect(response).to have_http_status(:unprocessable_content)
        expect(response.parsed_body["errors"]["url"]).to be_present
        expect(restaurant.reload.url).to eq("https://lilianewyork.com")
      end
    end

    it "rejects a bad Google Maps link too" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "Lilia")

      change_restaurant(restaurant, google_maps_url: "javascript:alert(1)")

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"]["google_maps_url"]).to be_present
      expect(restaurant.reload.google_maps_url).to be_nil
    end

    it "rejects a bad Yelp link too" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "Lilia")

      change_restaurant(restaurant, yelp_url: "mailto:hi@lilianewyork.com")

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"]["yelp_url"]).to be_present
      expect(restaurant.reload.yelp_url).to be_nil
    end
  end

  # Scenario Outline: Changing a restaurant I cannot reach. All three are
  # reported identically, because saying "not allowed" would confirm that
  # another owner's restaurant exists.
  describe "a restaurant I cannot reach" do
    it "reports a restaurant belonging to another owner as not found" do
      theirs = create(:restaurant, on_the_list_of: create(:user), name: "Joe's Pizza")

      change_restaurant(theirs, cuisine: "Pizza")

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["error"]).to eq("No such restaurant is on your list.")
      expect(theirs.reload.cuisine).to be_nil
    end

    it "reports a restaurant already off my list as not found" do
      taken_off = create(:restaurant, name: "Joe's Pizza")

      change_restaurant(taken_off, cuisine: "Pizza")

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["error"]).to eq("No such restaurant is on your list.")
      expect(taken_off.reload.cuisine).to be_nil
    end

    it "reports a restaurant that was never on my list as not found" do
      change_restaurant(0, cuisine: "Pizza")

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["error"]).to eq("No such restaurant is on your list.")
    end

    it "reports all three in one identical wording" do
      theirs = create(:restaurant, on_the_list_of: create(:user), name: "Joe's Pizza")
      taken_off = create(:restaurant, name: "Bar Primi")

      bodies = [ theirs.id, taken_off.id, 0 ].map do |id|
        change_restaurant(id, cuisine: "Pizza")
        [ response.status, response.body ]
      end

      expect(bodies.uniq.length).to eq(1)
    end
  end

  # Scenario: Managing my list while signed out
  describe "when my session has ended" do
    it "asks me to sign in, and changes nothing" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "Lilia")

      change_restaurant(restaurant, { cuisine: "Italian" }, {})

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]).to eq("Sign in to continue.")
      expect(restaurant.reload.cuisine).to be_nil
    end
  end
end
