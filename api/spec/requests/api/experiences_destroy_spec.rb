require "rails_helper"

# Derived from managing-experiences.scenarios.md. Background: I am signed in as
# the owner of my list, and today is 2026-10-27.
#
# The confirmation the scenario names — "And I acknowledge a confirmation
# dialog" — is drawn in managing-experiences.wireframe.drawio.svg and belongs to
# the browser. By the time a request arrives here it has been acknowledged.
RSpec.describe "DELETE /api/restaurants/:restaurant_id/experiences/:id" do
  let(:owner) { create(:user, email: "sam.reed@fastmail.com") }
  let(:joes) { create(:restaurant, on_the_list_of: owner, name: "Joe's Pizza") }

  around do |example|
    travel_to(Time.utc(2026, 10, 27, 12)) { example.run }
  end

  def remove_experience(experience_or_id, restaurant: joes, headers: headers_for(owner))
    id = experience_or_id.respond_to?(:id) ? experience_or_id.id : experience_or_id
    delete "/api/restaurants/#{restaurant.id}/experiences/#{id}", headers: headers, as: :json
  end

  # Scenario: Removing an experience I recorded against the wrong restaurant
  describe "removing the one experience a restaurant has" do
    let(:experience) do
      create(:experience, restaurant: joes, user: owner, rating: 3,
        occurred_on: Date.new(2026, 5, 2), recorded_at: Time.utc(2026, 5, 2))
    end

    it "leaves the restaurant showing no experiences" do
      remove_experience(experience)

      expect(response).to have_http_status(:no_content)
      expect(joes.reload.experience_count_for(owner)).to eq(0)
    end

    # "And it no longer reads as visited." Nothing sets that — visited is
    # derived from the count, so it follows from the row going.
    it "stops the restaurant reading as visited" do
      experience # recorded first, so the precondition below is about a visited restaurant

      expect(joes.reload.visited_by?(owner)).to be(true)

      remove_experience(experience)

      expect(joes.reload.visited_by?(owner)).to be(false)
    end

    # "And that experience is gone for good." Destroyed, not retained — the
    # opposite of a restaurant taken off the list, whose row survives.
    it "destroys it rather than keeping it out of reach" do
      experience

      expect { remove_experience(experience) }.to change(Experience, :count).by(-1)
      expect(Experience.find_by(id: experience.id)).to be_nil
    end

    # The restaurant itself stays on the list. Removing an experience is not
    # removing the place it happened at.
    it "leaves the restaurant on my list" do
      remove_experience(experience)

      expect(owner.restaurants.map(&:name)).to eq([ "Joe's Pizza" ])
    end
  end

  # Scenario: Removing one experience of several
  describe "removing one experience of several" do
    it "leaves the other one and keeps the restaurant visited" do
      older = create(:experience, restaurant: joes, user: owner, rating: 3,
        occurred_on: Date.new(2026, 5, 2), recorded_at: Time.utc(2026, 5, 2))
      newer = create(:experience, restaurant: joes, user: owner, rating: 4,
        occurred_on: Date.new(2026, 10, 20), recorded_at: Time.utc(2026, 10, 20))

      remove_experience(older)

      expect(response).to have_http_status(:no_content)
      expect(joes.reload.experiences.map(&:id)).to eq([ newer.id ])
      expect(joes.visited_by?(owner)).to be(true)
      expect(joes.experiences.first.rating.to_f).to eq(4.0)
      expect(joes.experiences.first.occurred_on).to eq(Date.new(2026, 10, 20))
    end
  end

  # Scenario: Changing an experience that is not mine — "When I try to change or
  # remove it, then it is reported as not found, and their experience is
  # unchanged."
  describe "an experience that is not mine" do
    it "reports another user's as not found through their own restaurant" do
      them = create(:user)
      theirs = create(:restaurant, on_the_list_of: them, name: "Joe's Pizza")
      experience = create(:experience, restaurant: theirs, user: them, rating: 3, occurred_on: nil)

      remove_experience(experience, restaurant: theirs)

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["error"]).to eq("No such restaurant is on your list.")
      expect(Experience.find_by(id: experience.id)).to be_present
    end

    it "reports another user's as not found when named under a restaurant of mine" do
      them = create(:user)
      theirs = create(:restaurant, on_the_list_of: them, name: "Lilia")
      experience = create(:experience, restaurant: theirs, user: them, rating: 3, occurred_on: nil)

      remove_experience(experience)

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["error"]).to eq("No such experience is at that restaurant.")
      expect(Experience.find_by(id: experience.id)).to be_present
    end

    it "reports one of my own named under the wrong restaurant as not found" do
      bar_primi = create(:restaurant, on_the_list_of: owner, name: "Bar Primi")
      experience = create(:experience, restaurant: bar_primi, user: owner, rating: 3, occurred_on: nil)

      remove_experience(experience)

      expect(response).to have_http_status(:not_found)
      expect(Experience.find_by(id: experience.id)).to be_present
    end

    it "reports one that never existed as not found" do
      expect { remove_experience(0) }.not_to change(Experience, :count)

      expect(response).to have_http_status(:not_found)
    end

    # An experience at a restaurant off my list is out of reach with it, and
    # removing it is as unreachable as reading it.
    it "reports one at a restaurant off my list as not found" do
      taken_off = create(:restaurant, name: "Bar Primi")
      experience = create(:experience, restaurant: taken_off, user: owner, rating: 3, occurred_on: nil)

      remove_experience(experience, restaurant: taken_off)

      expect(response).to have_http_status(:not_found)
      expect(Experience.find_by(id: experience.id)).to be_present
    end
  end

  # Scenario: Managing experiences while signed out — "And nothing changes".
  it "asks me to sign in and removes nothing" do
    experience = create(:experience, restaurant: joes, user: owner, rating: 3, occurred_on: nil)

    expect { remove_experience(experience, headers: {}) }.not_to change(Experience, :count)

    expect(response).to have_http_status(:unauthorized)
    expect(response.parsed_body["error"]).to eq("Sign in to continue.")
  end
end
