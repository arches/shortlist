require "rails_helper"

# Derived from managing-my-list.scenarios.md and shortlist.data.md's History and
# retention section: Removed buys retention, not recovery.
RSpec.describe "DELETE /api/restaurants/:id" do
  let(:owner) { create(:user, email: "sam.reed@fastmail.com") }

  def take_off(restaurant_or_id, headers = headers_for(owner))
    id = restaurant_or_id.respond_to?(:id) ? restaurant_or_id.id : restaurant_or_id
    delete "/api/restaurants/#{id}", headers: headers, as: :json
  end

  def get_the_list
    get "/api/restaurants", headers: headers_for(owner), as: :json
  end

  # Scenario: Taking a restaurant off my list that I have visited
  describe "a restaurant I have visited" do
    let!(:joes) { create(:restaurant, user: owner, name: "Joe's Pizza") }
    let!(:experiences) { create_list(:experience, 2, restaurant: joes, user: owner) }

    it "takes it off my list" do
      take_off(joes)

      expect(response).to have_http_status(:no_content)
    end

    it "leaves nothing named Joe's Pizza on my list" do
      take_off(joes)
      get_the_list

      expect(response.parsed_body.map { |r| r["name"] }).not_to include("Joe's Pizza")
    end

    # "And I can no longer reach those experiences." Nothing in the application
    # reads them back.
    it "puts those experiences out of reach" do
      take_off(joes)
      get_the_list

      expect(response.parsed_body).to eq([])
    end

    # Those experiences are retained rather than erased: a hard delete would
    # destroy years of the owner's own notes as a side effect of tidying.
    it "retains the experiences rather than erasing them" do
      expect { take_off(joes) }.not_to change(Experience, :count)

      expect(Experience.where(id: experiences.map(&:id)).count).to eq(2)
    end

    it "retains the restaurant row itself" do
      expect { take_off(joes) }.not_to change(Restaurant, :count)

      expect(joes.reload).to be_removed
    end

    it "frees the name for a new restaurant" do
      take_off(joes)

      post "/api/restaurants", params: { restaurant: { name: "Joe's Pizza" } },
        headers: headers_for(owner), as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["experience_count"]).to eq(0)
    end
  end

  describe "a restaurant I have never been to" do
    it "takes it off my list" do
      lilia = create(:restaurant, user: owner, name: "Lilia")

      take_off(lilia)

      expect(response).to have_http_status(:no_content)
      expect(lilia.reload).to be_removed
    end
  end

  # Scenario Outline: Changing a restaurant I cannot reach — "When I try to
  # change or remove it", so removal takes the same three rows.
  describe "a restaurant I cannot reach" do
    it "reports a restaurant belonging to another owner as not found" do
      theirs = create(:restaurant, user: create(:user), name: "Joe's Pizza")

      take_off(theirs)

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["error"]).to eq("No such restaurant is on your list.")
      expect(theirs.reload).not_to be_removed
    end

    it "reports a restaurant already off my list as not found" do
      taken_off = create(:restaurant, :removed, user: owner, name: "Joe's Pizza",
        removed_at: 1.week.ago)

      take_off(taken_off)

      expect(response).to have_http_status(:not_found)
      expect(taken_off.reload.removed_at).to be_within(1.second).of(1.week.ago)
    end

    it "reports a restaurant that was never on my list as not found" do
      take_off(0)

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["error"]).to eq("No such restaurant is on your list.")
    end

    it "reports all three in one identical wording" do
      theirs = create(:restaurant, user: create(:user), name: "Joe's Pizza")
      already_off = create(:restaurant, :removed, user: owner, name: "Bar Primi")

      bodies = [ theirs.id, already_off.id, 0 ].map do |id|
        take_off(id)
        [ response.status, response.body ]
      end

      expect(bodies.uniq.length).to eq(1)
    end
  end

  # Scenario: Managing my list while signed out
  describe "when my session has ended" do
    it "asks me to sign in, and takes nothing off my list" do
      lilia = create(:restaurant, user: owner, name: "Lilia")

      take_off(lilia, {})

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]).to eq("Sign in to continue.")
      expect(lilia.reload).not_to be_removed
    end
  end
end
