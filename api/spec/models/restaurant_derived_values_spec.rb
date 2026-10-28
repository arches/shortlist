require "rails_helper"

# shortlist.data.md, Derived: none of these is stored. The wireframe's card
# subtitle — "Mexican . visited . 2 experiences" — is what reads them.
RSpec.describe "A Restaurant's derived values" do
  let(:owner) { create(:user) }
  let(:restaurant) { create(:restaurant, user: owner, name: "Joe's Pizza") }

  describe "experience count" do
    it "is zero for a Restaurant only heard the name of" do
      expect(restaurant.experience_count).to eq(0)
    end

    it "counts the Restaurant's Experiences" do
      create_list(:experience, 2, restaurant: restaurant, user: owner)

      expect(restaurant.reload.experience_count).to eq(2)
    end

    it "counts only its own" do
      create(:experience, restaurant: restaurant, user: owner)
      create(:experience, restaurant: create(:restaurant, user: owner), user: owner)

      expect(restaurant.reload.experience_count).to eq(1)
    end
  end

  # Visited is the experience count being greater than zero.
  describe "visited" do
    it "is false for a Restaurant with no Experiences" do
      expect(restaurant).not_to be_visited
    end

    it "is true once it has one" do
      create(:experience, restaurant: restaurant, user: owner)

      expect(restaurant.reload).to be_visited
    end
  end

  describe "last experienced on" do
    it "is absent when the Restaurant has no Experiences" do
      expect(restaurant.last_experienced_on).to be_nil
    end

    it "is absent when none of its Experiences carries a date" do
      create(:experience, restaurant: restaurant, user: owner, occurred_on: nil)

      expect(restaurant.reload.last_experienced_on).to be_nil
    end

    it "is the latest occurred_on across its Experiences" do
      create(:experience, restaurant: restaurant, user: owner, occurred_on: 2.years.ago.to_date)
      create(:experience, restaurant: restaurant, user: owner, occurred_on: 3.days.ago.to_date)
      create(:experience, restaurant: restaurant, user: owner, occurred_on: 1.year.ago.to_date)

      expect(restaurant.reload.last_experienced_on).to eq(3.days.ago.to_date)
    end

    it "ignores the Experiences that carry no date" do
      create(:experience, restaurant: restaurant, user: owner, occurred_on: 2.years.ago.to_date)
      create(:experience, restaurant: restaurant, user: owner, occurred_on: nil)

      expect(restaurant.reload.last_experienced_on).to eq(2.years.ago.to_date)
    end
  end

  describe "as_json" do
    it "carries the three derived values and never removed_at" do
      create(:experience, restaurant: restaurant, user: owner, occurred_on: 3.days.ago.to_date)

      json = restaurant.reload.as_json

      expect(json["visited"]).to be(true)
      expect(json["experience_count"]).to eq(1)
      expect(json["last_experienced_on"]).to eq(3.days.ago.to_date)
      expect(json).not_to include("removed_at")
    end

    it "reads as not visited with no Experiences" do
      json = restaurant.as_json

      expect(json["visited"]).to be(false)
      expect(json["experience_count"]).to eq(0)
      expect(json["last_experienced_on"]).to be_nil
    end
  end
end
