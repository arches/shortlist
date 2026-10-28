require "rails_helper"

# Derived from the read-back scenarios in managing-experiences.scenarios.md, and
# from the unreachable-restaurant outline it shares with
# managing-my-list.scenarios.md. Background: I am signed in as the owner of my
# list, and today is 2026-10-27.
RSpec.describe "GET /api/restaurants/:restaurant_id/experiences" do
  let(:owner) { create(:user, email: "sam.reed@fastmail.com") }
  let(:restaurant) { create(:restaurant, user: owner, name: "Joe's Pizza") }

  around do |example|
    travel_to(Time.utc(2026, 10, 27, 12)) { example.run }
  end

  def read_experiences(restaurant_or_id, headers = headers_for(owner))
    id = restaurant_or_id.respond_to?(:id) ? restaurant_or_id.id : restaurant_or_id
    get "/api/restaurants/#{id}/experiences", headers: headers, as: :json
  end

  def experience(occurred_on:, recorded_at:, rating: nil, notes: nil, at: restaurant)
    create(
      :experience,
      restaurant: at,
      user: at.user,
      occurred_on: occurred_on,
      recorded_at: recorded_at,
      rating: rating,
      notes: notes
    )
  end

  # Scenario: Reading a restaurant's experiences back
  describe "opening a restaurant" do
    it "reads the most recent first" do
      experience(occurred_on: Date.new(2026, 10, 20), recorded_at: Time.utc(2026, 10, 26, 10))
      experience(occurred_on: Date.new(2026, 5, 2), recorded_at: Time.utc(2026, 10, 26, 11))
      experience(occurred_on: Date.new(2019, 6, 14), recorded_at: Time.utc(2026, 10, 26, 12))

      read_experiences(restaurant)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.map { |one| one["occurred_on"] })
        .to eq([ "2026-10-20", "2026-05-02", "2019-06-14" ])
    end

    # Scenario: Where an undated experience sits
    it "puts an undated experience at the end" do
      experience(occurred_on: Date.new(2026, 10, 24), recorded_at: Time.utc(2026, 10, 24))
      experience(occurred_on: nil, recorded_at: Time.utc(2026, 10, 20), notes: "Queue out the door")
      experience(occurred_on: Date.new(2026, 5, 2), recorded_at: Time.utc(2026, 5, 2))

      read_experiences(restaurant)

      expect(response.parsed_body.map { |one| one["occurred_on"] })
        .to eq([ "2026-10-24", "2026-05-02", nil ])
    end

    # Scenario: Two experiences on one day, read back
    it "breaks a tie on one day with the one written down later" do
      experience(occurred_on: Date.new(2026, 10, 20), recorded_at: Time.utc(2026, 10, 20, 13), rating: 4)
      experience(occurred_on: Date.new(2026, 10, 20), recorded_at: Time.utc(2026, 10, 20, 21), rating: 2.5)

      read_experiences(restaurant)

      expect(response.parsed_body.map { |one| one["rating"] }).to eq([ 2.5, 4.0 ])
    end

    # Scenario: Adding a restaurant I have only heard the name of — "And it has
    # no experiences".
    it "reads back nothing for a restaurant only heard the name of" do
      read_experiences(restaurant)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq([])
    end

    # An Experience belongs to exactly one Restaurant, so another restaurant's
    # experiences are not reachable through this one.
    it "reads back only this restaurant's own" do
      bar_primi = create(:restaurant, user: owner, name: "Bar Primi")
      experience(occurred_on: Date.new(2026, 10, 20), recorded_at: Time.utc(2026, 10, 21))
      experience(occurred_on: Date.new(2026, 10, 22), recorded_at: Time.utc(2026, 10, 23), at: bar_primi)

      read_experiences(restaurant)

      expect(response.parsed_body.map { |one| one["occurred_on"] }).to eq([ "2026-10-20" ])
    end
  end

  # Scenario Outline: Recording an experience at a restaurant I cannot reach,
  # read from the other side. Three situations, one outcome, because telling
  # them apart would let somebody probe another owner's list for what is on it.
  describe "a restaurant I cannot reach" do
    it "reports a restaurant belonging to another user as not found" do
      theirs = create(:restaurant, user: create(:user), name: "Joe's Pizza")
      experience(occurred_on: Date.new(2026, 10, 20), recorded_at: Time.utc(2026, 10, 21), at: theirs)

      read_experiences(theirs)

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["error"]).to eq("No such restaurant is on your list.")
    end

    # managing-my-list.scenarios.md: "And I can no longer reach those
    # experiences". The rows survive — Removed buys retention, not recovery —
    # and nothing reads them back.
    it "reports a restaurant off my list as not found, experiences and all" do
      taken_off = create(:restaurant, :removed, user: owner, name: "Bar Primi")
      experience(occurred_on: Date.new(2026, 10, 20), recorded_at: Time.utc(2026, 10, 21), at: taken_off)

      read_experiences(taken_off)

      expect(response).to have_http_status(:not_found)
      expect(taken_off.experiences.count).to eq(1)
    end

    it "reports a restaurant that was never on my list as not found" do
      read_experiences(0)

      expect(response).to have_http_status(:not_found)
    end

    it "reports all three in one identical wording" do
      theirs = create(:restaurant, user: create(:user), name: "Joe's Pizza")
      taken_off = create(:restaurant, :removed, user: owner, name: "Bar Primi")

      bodies = [ theirs.id, taken_off.id, 0 ].map do |id|
        read_experiences(id)
        [ response.status, response.body ]
      end

      expect(bodies.uniq.length).to eq(1)
    end
  end

  # Scenario: Managing experiences while signed out — "Then I am asked to sign
  # in". One refusal for an absent token, a malformed one, and an expired one.
  describe "while signed out" do
    it "asks me to sign in when no token is presented" do
      read_experiences(restaurant, {})

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]).to eq("Sign in to continue.")
    end

    it "asks me to sign in when the token is not mine to present" do
      read_experiences(restaurant, auth_headers("not-a-token"))

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
