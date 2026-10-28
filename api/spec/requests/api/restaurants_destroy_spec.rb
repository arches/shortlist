require "rails_helper"

# Derived from shortlist.data.md's Ownership statements — removing a list item
# destroys that row and nothing else — and from the Remove confirmation in
# managing-my-list.wireframe.drawio. The refusals match RestaurantScope.
RSpec.describe "DELETE /api/restaurants/:id" do
  let(:owner) { create(:user, email: "sam.reed@fastmail.com") }

  def take_off(id, headers = headers_for(owner))
    delete "/api/restaurants/#{id}", headers: headers, as: :json
  end

  describe "a restaurant I have visited" do
    let(:restaurant) { create(:restaurant, on_the_list_of: owner, name: "Joe's Pizza") }
    let!(:experiences) { create_list(:experience, 2, restaurant: restaurant, user: owner) }

    it "takes it off my list" do
      take_off(restaurant.id)

      expect(response).to have_http_status(:no_content)
      expect(owner.restaurants.reload).to be_empty
    end

    it "destroys the List item and nothing else" do
      expect { take_off(restaurant.id) }.to change(ListItem, :count).by(-1)

      expect(Restaurant.exists?(restaurant.id)).to be(true)
    end

    # managing-experiences.wireframe.drawio.svg: taking a restaurant off the
    # list keeps its experiences. They stand, out of reach until it goes back
    # on — shortlist.data.md, Invariants.
    it "leaves my experiences at it standing" do
      expect { take_off(restaurant.id) }.not_to change(Experience, :count)

      expect(experiences.map { |e| Experience.exists?(e.id) }).to all(be(true))
    end

    # A Restaurant is shared, so somebody else's list is untouched by mine.
    it "leaves it on another owner's list" do
      somebody_else = create(:user)
      create(:list_item, list: somebody_else.lists.sole, restaurant: restaurant)

      take_off(restaurant.id)

      expect(somebody_else.restaurants.reload).to contain_exactly(restaurant)
    end
  end

  describe "a restaurant I have never been to" do
    it "takes it off my list" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "Bar Primi")

      take_off(restaurant.id)

      expect(response).to have_http_status(:no_content)
      expect(owner.restaurants.reload).to be_empty
    end
  end

  # Putting it back on is an ordinary add. What does not come back is reach of
  # the old experiences until it does — they were never destroyed.
  describe "putting it back on afterwards" do
    it "brings my old experiences back into reach" do
      restaurant = create(:restaurant, on_the_list_of: owner, google_place_id: "ChIJJoes")
      create(:experience, restaurant: restaurant, user: owner)

      take_off(restaurant.id)
      post "/api/restaurants",
        params: { restaurant: { google_place_id: "ChIJJoes" } },
        headers: headers_for(owner), as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["experience_count"]).to eq(1)
      expect(response.parsed_body["visited"]).to be(true)
    end
  end

  # One refusal for every restaurant I cannot reach. "Belongs to another user"
  # is not a case that exists any more — a Restaurant is shared — so what it
  # used to mean is a Place on somebody else's list and not on mine.
  describe "a restaurant I cannot reach" do
    it "reports one on somebody else's list as not found" do
      theirs = create(:restaurant, on_the_list_of: create(:user))

      take_off(theirs.id)

      expect(response).to have_http_status(:not_found)
      expect(ListItem.count).to eq(1)
    end

    it "reports one already off my list as not found" do
      restaurant = create(:restaurant)

      take_off(restaurant.id)

      expect(response).to have_http_status(:not_found)
    end

    it "reports all three in one identical wording" do
      wordings = [
        create(:restaurant, on_the_list_of: create(:user)).id,
        create(:restaurant).id,
        0
      ].map do |id|
        take_off(id)
        [ response.status, response.parsed_body["error"] ]
      end

      expect(wordings.uniq.size).to eq(1)
      expect(wordings.first).to eq([ 404, RestaurantScope::NOT_FOUND ])
    end
  end

  describe "when my session has ended" do
    it "asks me to sign in, and takes nothing off my list" do
      restaurant = create(:restaurant, on_the_list_of: owner)

      expect { take_off(restaurant.id, {}) }.not_to change(ListItem, :count)

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
