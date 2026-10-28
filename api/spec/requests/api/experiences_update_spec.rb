require "rails_helper"

# Derived from managing-experiences.scenarios.md. Background: I am signed in as
# the owner of my list, and today is 2026-10-27.
#
# An experience has no name, so unlike a restaurant it cannot be picked out by
# one. Each test here reaches one by the id the owner's own screen holds.
RSpec.describe "PATCH /api/restaurants/:restaurant_id/experiences/:id" do
  let(:owner) { create(:user, email: "sam.reed@fastmail.com") }
  let(:lilia) { create(:restaurant, user: owner, name: "Lilia") }

  around do |example|
    travel_to(Time.utc(2026, 10, 27, 12)) { example.run }
  end

  def change_experience(experience_or_id, attributes, restaurant: lilia, headers: headers_for(owner))
    id = experience_or_id.respond_to?(:id) ? experience_or_id.id : experience_or_id
    patch "/api/restaurants/#{restaurant.id}/experiences/#{id}",
      params: { experience: attributes }, headers: headers, as: :json
  end

  # Scenario: Correcting a rating I regret. An edit overwrites — there is no
  # history of the history, so a corrected rating leaves no trace.
  describe "correcting a rating I regret" do
    let(:experience) do
      create(:experience, restaurant: lilia, user: owner, rating: 4.5,
        notes: "The mafaldini is the whole reason to come", occurred_on: nil)
    end

    it "shows the new rating" do
      change_experience(experience, { rating: 5 })

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["rating"]).to eq(5.0)
      expect(experience.reload.rating.to_f).to eq(5.0)
    end

    it "leaves the note unchanged" do
      change_experience(experience, { rating: 5 })

      expect(response.parsed_body["notes"]).to eq("The mafaldini is the whole reason to come")
    end

    # "And no earlier version of it is shown anywhere." An edit overwrites, so
    # there is one row and it carries one rating.
    it "keeps no earlier version of it" do
      experience # recorded before the block, so the count only moves if the edit moves it

      expect { change_experience(experience, { rating: 5 }) }.not_to change(Experience, :count)

      expect(lilia.reload.experiences.map { |one| one.rating.to_f }).to eq([ 5.0 ])
    end
  end

  # Scenario: Clearing a date I was never sure of
  describe "clearing a date I was never sure of" do
    let(:experience) do
      create(:experience, restaurant: lilia, user: owner, rating: 4.5,
        notes: nil, occurred_on: Date.new(2026, 10, 18))
    end

    it "shows no date, keeps the rating, and keeps the restaurant visited" do
      change_experience(experience, { occurred_on: nil })

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["occurred_on"]).to be_nil
      expect(response.parsed_body["rating"]).to eq(4.5)
      expect(lilia.reload).to be_visited
    end

    it "leaves an attribute alone when it is not mentioned at all" do
      change_experience(experience, { occurred_on: nil })

      expect(experience.reload.rating.to_f).to eq(4.5)
    end
  end

  # Scenario: Clearing the last thing an experience says. The emptiness rule
  # holds on a change as well as on a recording — checked only at the moment of
  # recording, it is reachable in two steps by anybody who writes a rating and
  # then deletes it.
  describe "clearing the last thing an experience says" do
    it "rejects it as empty and leaves the rating standing" do
      experience = create(:experience, restaurant: lilia, user: owner,
        rating: 4.5, notes: nil, occurred_on: nil)

      change_experience(experience, { rating: nil })

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"]["base"]).to include("needs a rating, a note or a date")
      expect(experience.reload.rating.to_f).to eq(4.5)
    end

    it "rejects clearing the last note the same way" do
      experience = create(:experience, restaurant: lilia, user: owner,
        rating: nil, notes: "Queue out the door", occurred_on: nil)

      change_experience(experience, { notes: nil })

      expect(response).to have_http_status(:unprocessable_content)
      expect(experience.reload.notes).to eq("Queue out the door")
    end

    # Clearing one of two is not clearing the last one, so it stands.
    it "allows clearing one when something else remains" do
      experience = create(:experience, restaurant: lilia, user: owner,
        rating: 4.5, notes: "Queue out the door", occurred_on: nil)

      change_experience(experience, { notes: nil })

      expect(response).to have_http_status(:ok)
      expect(experience.reload.notes).to be_nil
      expect(experience.rating.to_f).to eq(4.5)
    end
  end

  # Scenario Outline: Giving an experience a rating that is not one of the nine,
  # reached on a change rather than on a recording.
  describe "a rating that is not one of the nine" do
    [ 0, 5.5, 3.7, -2 ].each do |rating|
      it "rejects #{rating} and leaves the rating standing" do
        experience = create(:experience, restaurant: lilia, user: owner, rating: 4.5, occurred_on: nil)

        change_experience(experience, { rating: rating })

        expect(response).to have_http_status(:unprocessable_content)
        expect(experience.reload.rating.to_f).to eq(4.5)
      end
    end
  end

  # Scenario: Recording an experience dated in the future, reached on a change.
  # A future date is a typo; Shortlist holds no reservations.
  it "rejects a date in the future and changes nothing" do
    experience = create(:experience, restaurant: lilia, user: owner,
      rating: 4.5, occurred_on: Date.new(2026, 10, 18))

    change_experience(experience, { occurred_on: "2026-10-28" })

    expect(response).to have_http_status(:unprocessable_content)
    expect(experience.reload.occurred_on).to eq(Date.new(2026, 10, 18))
  end

  # Scenario: Changing an experience that is not mine — "Then it is reported as
  # not found, and their experience is unchanged."
  describe "an experience that is not mine" do
    it "reports another user's as not found through their own restaurant" do
      them = create(:user)
      theirs = create(:restaurant, user: them, name: "Joe's Pizza")
      experience = create(:experience, restaurant: theirs, user: them, rating: 3, occurred_on: nil)

      change_experience(experience, { rating: 5 }, restaurant: theirs)

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["error"]).to eq("No such restaurant is on your list.")
      expect(experience.reload.rating.to_f).to eq(3.0)
    end

    # Their restaurant is out of reach, so naming theirs under one of mine is
    # the only way the experience-level refusal is reachable at all.
    it "reports another user's as not found when named under a restaurant of mine" do
      them = create(:user)
      theirs = create(:restaurant, user: them, name: "Joe's Pizza")
      experience = create(:experience, restaurant: theirs, user: them, rating: 3, occurred_on: nil)

      change_experience(experience, { rating: 5 })

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["error"]).to eq("No such experience is at that restaurant.")
      expect(experience.reload.rating.to_f).to eq(3.0)
    end

    it "reports one of my own named under the wrong restaurant as not found" do
      bar_primi = create(:restaurant, user: owner, name: "Bar Primi")
      experience = create(:experience, restaurant: bar_primi, user: owner, rating: 3, occurred_on: nil)

      change_experience(experience, { rating: 5 })

      expect(response).to have_http_status(:not_found)
      expect(experience.reload.rating.to_f).to eq(3.0)
    end

    it "reports an experience that never existed as not found" do
      change_experience(0, { rating: 5 })

      expect(response).to have_http_status(:not_found)
    end

    # An experience of a restaurant off my list is out of reach with it.
    it "reports one at a restaurant off my list as not found" do
      taken_off = create(:restaurant, :removed, user: owner, name: "Bar Primi")
      experience = create(:experience, restaurant: taken_off, user: owner, rating: 3, occurred_on: nil)

      change_experience(experience, { rating: 5 }, restaurant: taken_off)

      expect(response).to have_http_status(:not_found)
      expect(experience.reload.rating.to_f).to eq(3.0)
    end
  end

  # Scenario: Managing experiences while signed out — "And nothing changes".
  it "asks me to sign in and changes nothing" do
    experience = create(:experience, restaurant: lilia, user: owner, rating: 4.5, occurred_on: nil)

    change_experience(experience, { rating: 5 }, headers: {})

    expect(response).to have_http_status(:unauthorized)
    expect(response.parsed_body["error"]).to eq("Sign in to continue.")
    expect(experience.reload.rating.to_f).to eq(4.5)
  end
end
