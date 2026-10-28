require "rails_helper"

# Derived from managing-experiences.scenarios.md. Background: I am signed in as
# the owner of my list, and today is 2026-10-27.
RSpec.describe "POST /api/restaurants/:restaurant_id/experiences" do
  let(:owner) { create(:user, email: "sam.reed@fastmail.com") }

  around do |example|
    travel_to(Time.utc(2026, 10, 27, 12)) { example.run }
  end

  def record_experience(restaurant_or_id, attributes, headers = headers_for(owner))
    id = restaurant_or_id.respond_to?(:id) ? restaurant_or_id.id : restaurant_or_id
    post "/api/restaurants/#{id}/experiences",
      params: { experience: attributes }, headers: headers, as: :json
  end

  def restaurant_named(name, **attributes)
    create(:restaurant, user: owner, name: name, **attributes)
  end

  # Scenario: Writing down what I thought of a meal
  describe "writing down what I thought of a meal" do
    it "records the rating, the date and the note" do
      lilia = restaurant_named("Lilia")

      record_experience(lilia, rating: 4.5, occurred_on: "2026-10-18",
        notes: "The mafaldini is the whole reason to come")

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["rating"]).to eq(4.5)
      expect(response.parsed_body["occurred_on"]).to eq("2026-10-18")
      expect(response.parsed_body["notes"]).to eq("The mafaldini is the whole reason to come")
    end

    # "Recording an experience is what makes a restaurant read as visited.
    # Nothing else sets that."
    it "makes the restaurant read as visited" do
      lilia = restaurant_named("Lilia")
      expect(lilia.reload).not_to be_visited

      record_experience(lilia, rating: 4.5, occurred_on: "2026-10-18")

      expect(lilia.reload).to be_visited
      expect(lilia.experience_count).to eq(1)
    end
  end

  # The three shapes an experience can arrive in, each complete on its own.
  # Requiring a rating would turn every meal into a judgement; requiring a note
  # would stop an owner recording the eleven adequate dinners between the
  # memorable ones.
  describe "the three things an experience can say" do
    # Scenario: Recording a rating and nothing else
    it "records a rating with no date and no note" do
      joes = restaurant_named("Joe's Pizza")

      record_experience(joes, rating: 3)

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["rating"]).to eq(3.0)
      expect(response.parsed_body["occurred_on"]).to be_nil
      expect(response.parsed_body["notes"]).to be_nil
      expect(joes.reload).to be_visited
    end

    # Scenario: Recording something worth remembering without scoring it
    it "records a note with no rating" do
      tacos = restaurant_named("Tacos El Bronco")

      record_experience(tacos, notes: "Suadero sold out by 8pm", rating: nil)

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["rating"]).to be_nil
      expect(response.parsed_body["notes"]).to eq("Suadero sold out by 8pm")
      expect(tacos.reload).to be_visited
    end

    it "records a date with no rating and no note" do
      lilia = restaurant_named("Lilia")

      record_experience(lilia, occurred_on: "2026-10-18")

      expect(response).to have_http_status(:created)
      expect(lilia.reload).to be_visited
    end
  end

  describe "more than one at the same restaurant" do
    # Scenario: Going back. A second experience does not revise the first.
    it "sits the second beside the first rather than merging them" do
      joes = restaurant_named("Joe's Pizza")
      create(:experience, restaurant: joes, user: owner, rating: 3,
        occurred_on: Date.new(2026, 5, 2), recorded_at: Time.utc(2026, 5, 2))

      record_experience(joes, rating: 4, occurred_on: "2026-10-20")

      expect(response).to have_http_status(:created)
      expect(joes.reload.experience_count).to eq(2)
      expect(joes.experiences.map { |one| one.rating.to_f }).to contain_exactly(3.0, 4.0)
    end

    # The restaurant carries no score summarising them — see Rating in
    # shortlist.glossary.md. There is no such thing as a rating of a restaurant.
    it "gives the restaurant no overall rating of its own" do
      joes = restaurant_named("Joe's Pizza")
      create(:experience, restaurant: joes, user: owner, rating: 3,
        occurred_on: Date.new(2026, 5, 2), recorded_at: Time.utc(2026, 5, 2))

      record_experience(joes, rating: 4, occurred_on: "2026-10-20")

      expect(response.parsed_body).not_to include("restaurant_rating", "average_rating", "rating_average")
      expect(joes.reload.as_json.keys).not_to include("rating", "average_rating")
    end

    # Scenario: Two experiences on the same day. Lunch and dinner are two
    # experiences; nothing treats a date as something a restaurant holds one of.
    it "takes a second on a day it already has one" do
      tacos = restaurant_named("Tacos El Bronco")
      create(:experience, restaurant: tacos, user: owner, rating: 4,
        occurred_on: Date.new(2026, 10, 20), recorded_at: Time.utc(2026, 10, 20, 13))

      record_experience(tacos, rating: 2.5, occurred_on: "2026-10-20")

      expect(response).to have_http_status(:created)
      expect(tacos.reload.experience_count).to eq(2)
    end
  end

  # Scenario: Recording a meal from long before the restaurant went on my list.
  # Putting a restaurant on the list is when the owner got round to writing it
  # down, not when they first ate there.
  it "takes a meal from long before the restaurant went on the list" do
    bar_primi = restaurant_named("Bar Primi", added_at: Time.utc(2026, 10, 1))

    record_experience(bar_primi, rating: 4, occurred_on: "2019-06-14")

    expect(response).to have_http_status(:created)
    expect(response.parsed_body["occurred_on"]).to eq("2019-06-14")
    expect(bar_primi.reload).to be_visited
  end

  # Scenario: Recording an experience with nothing in it. All three absent is
  # not an experience, which is the one rule that makes the others safe to leave
  # optional.
  describe "an experience with nothing in it" do
    it "rejects it as empty and leaves the restaurant unvisited" do
      lilia = restaurant_named("Lilia")

      record_experience(lilia, rating: nil, notes: nil, occurred_on: nil)

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"]["base"]).to include("needs a rating, a note or a date")
      expect(lilia.reload).not_to be_visited
    end

    # Rejected as empty rather than as a malformed request, so the invariant is
    # what the owner is told about either way.
    it "rejects one that names no attributes at all the same way" do
      lilia = restaurant_named("Lilia")

      post "/api/restaurants/#{lilia.id}/experiences", headers: headers_for(owner), as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"]["base"]).to include("needs a rating, a note or a date")
    end

    # Whitespace is not something worth remembering.
    it "rejects a note of nothing but spaces" do
      lilia = restaurant_named("Lilia")

      record_experience(lilia, notes: "   ")

      expect(response).to have_http_status(:unprocessable_content)
      expect(lilia.reload).not_to be_visited
    end
  end

  # Scenario: Recording an experience dated in the future. A future date is a
  # typo — Shortlist holds no reservations.
  it "rejects a date in the future and records nothing" do
    lilia = restaurant_named("Lilia")

    record_experience(lilia, rating: 4, occurred_on: "2026-10-28")

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body["errors"]["occurred_on"])
      .to include("Occurred on cannot be later than the day it is recorded")
    expect(lilia.reload.experience_count).to eq(0)
  end

  it "takes today's date, which is not the future" do
    lilia = restaurant_named("Lilia")

    record_experience(lilia, rating: 4, occurred_on: "2026-10-27")

    expect(response).to have_http_status(:created)
  end

  # Scenario Outline: Giving an experience a rating that is not one of the nine.
  # A rating is one of nine values, not a number between one and five.
  describe "a rating that is not one of the nine" do
    {
      "0" => "there is no nought-star experience",
      "5.5" => "five is the top",
      "3.7" => "ratings move in half-stars",
      "-2" => "the scale has no negative end"
    }.each do |rating, why|
      it "rejects #{rating}, because #{why}" do
        lilia = restaurant_named("Lilia")

        record_experience(lilia, rating: rating)

        expect(response).to have_http_status(:unprocessable_content)
        expect(lilia.reload.experience_count).to eq(0)
      end
    end

    # Note the difference between a rating of 0, which is rejected, and no
    # rating at all, which is fine.
    it "accepts each of the nine" do
      Experience::RATINGS.each do |value|
        lilia = restaurant_named("Lilia #{value}")

        record_experience(lilia, rating: value.to_f)

        expect(response).to have_http_status(:created)
        expect(response.parsed_body["rating"]).to eq(value.to_f)
      end
    end
  end

  # Scenario Outline: Recording an experience at a restaurant I cannot reach.
  # Three situations, one outcome — telling them apart would let somebody probe
  # another owner's list for what is on it.
  describe "a restaurant I cannot reach" do
    it "reports another user's restaurant as not found and records nothing" do
      theirs = create(:restaurant, user: create(:user), name: "Joe's Pizza")

      record_experience(theirs, rating: 4)

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["error"]).to eq("No such restaurant is on your list.")
      expect(theirs.reload.experience_count).to eq(0)
    end

    it "reports a restaurant off my list as not found and records nothing" do
      taken_off = create(:restaurant, :removed, user: owner, name: "Joe's Pizza")

      record_experience(taken_off, rating: 4)

      expect(response).to have_http_status(:not_found)
      expect(taken_off.reload.experience_count).to eq(0)
    end

    it "reports a restaurant that was never on my list as not found" do
      expect { record_experience(0, rating: 4) }.not_to change(Experience, :count)

      expect(response).to have_http_status(:not_found)
    end

    it "reports all three in one identical wording" do
      theirs = create(:restaurant, user: create(:user), name: "Joe's Pizza")
      taken_off = create(:restaurant, :removed, user: owner, name: "Bar Primi")

      bodies = [ theirs.id, taken_off.id, 0 ].map do |id|
        record_experience(id, rating: 4)
        [ response.status, response.body ]
      end

      expect(bodies.uniq.length).to eq(1)
    end
  end

  # shortlist.data.md, Invariants: an Experience's owner is the same User as its
  # Restaurant's owner. The owner comes from the scope, so a request that names
  # somebody else cannot move it.
  it "ignores an owner named in the request" do
    lilia = restaurant_named("Lilia")
    somebody_else = create(:user)

    record_experience(lilia, rating: 4, user_id: somebody_else.id)

    expect(response).to have_http_status(:created)
    expect(Experience.last.user_id).to eq(owner.id)
  end

  # Scenario: Managing experiences while signed out — "And nothing changes".
  describe "while signed out" do
    it "asks me to sign in and records nothing" do
      lilia = restaurant_named("Lilia")

      expect { record_experience(lilia, { rating: 4 }, {}) }.not_to change(Experience, :count)

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]).to eq("Sign in to continue.")
    end
  end
end
