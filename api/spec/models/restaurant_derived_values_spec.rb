require "rails_helper"

# shortlist.data.md, Derived: none of these is stored, and all three are one
# owner's. A Restaurant is never visited in its own right, only visited by
# somebody, so another owner's Experiences never show on my List item. The
# wireframe's card subtitle is what reads them.
RSpec.describe "A Restaurant's derived values" do
  let(:owner) { create(:user) }
  let(:somebody_else) { create(:user) }
  let(:restaurant) { create(:restaurant, on_the_list_of: owner, name: "Joe's Pizza") }

  describe "experience count" do
    it "is zero for a Restaurant only just put on the list" do
      expect(restaurant.experience_count_for(owner)).to eq(0)
    end

    it "counts that owner's Experiences here" do
      create_list(:experience, 2, restaurant: restaurant, user: owner)

      expect(restaurant.reload.experience_count_for(owner)).to eq(2)
    end

    it "counts only this Restaurant's own" do
      create(:experience, restaurant: restaurant, user: owner)
      create(:experience, restaurant: create(:restaurant, on_the_list_of: owner), user: owner)

      expect(restaurant.reload.experience_count_for(owner)).to eq(1)
    end

    # The Restaurant row is shared, so somebody else's meals are at the same
    # Place. They are not mine and they do not show on my card.
    it "counts only that owner's, never another's at the same Place" do
      create(:experience, restaurant: restaurant, user: somebody_else)

      expect(restaurant.reload.experience_count_for(owner)).to eq(0)
      expect(restaurant.experience_count_for(somebody_else)).to eq(1)
    end
  end

  # Visited is that count being greater than zero.
  describe "visited" do
    it "is false for an owner with no Experiences here" do
      expect(restaurant.visited_by?(owner)).to be(false)
    end

    it "is true once that owner has one" do
      create(:experience, restaurant: restaurant, user: owner)

      expect(restaurant.reload.visited_by?(owner)).to be(true)
    end

    it "is false for me when only somebody else has been" do
      create(:experience, restaurant: restaurant, user: somebody_else)

      expect(restaurant.reload.visited_by?(owner)).to be(false)
    end
  end

  describe "last experienced on" do
    it "is absent when that owner has no Experiences here" do
      expect(restaurant.last_experienced_on_for(owner)).to be_nil
    end

    it "is absent when none of them carries a date" do
      create(:experience, restaurant: restaurant, user: owner, occurred_on: nil)

      expect(restaurant.reload.last_experienced_on_for(owner)).to be_nil
    end

    it "is the latest occurred_on across that owner's Experiences" do
      create(:experience, restaurant: restaurant, user: owner, occurred_on: 2.years.ago.to_date)
      create(:experience, restaurant: restaurant, user: owner, occurred_on: 3.days.ago.to_date)
      create(:experience, restaurant: restaurant, user: owner, occurred_on: 1.year.ago.to_date)

      expect(restaurant.reload.last_experienced_on_for(owner)).to eq(3.days.ago.to_date)
    end

    it "ignores the ones that carry no date" do
      create(:experience, restaurant: restaurant, user: owner, occurred_on: 2.years.ago.to_date)
      create(:experience, restaurant: restaurant, user: owner, occurred_on: nil)

      expect(restaurant.reload.last_experienced_on_for(owner)).to eq(2.years.ago.to_date)
    end

    it "ignores another owner's, however recent" do
      create(:experience, restaurant: restaurant, user: owner, occurred_on: 2.years.ago.to_date)
      create(:experience, restaurant: restaurant, user: somebody_else, occurred_on: Date.current)

      expect(restaurant.reload.last_experienced_on_for(owner)).to eq(2.years.ago.to_date)
    end
  end

  describe "as_json" do
    it "carries the three derived values for the owner asking" do
      create(:experience, restaurant: restaurant, user: owner, occurred_on: 3.days.ago.to_date)

      json = restaurant.reload.as_json(owner: owner)

      expect(json["visited"]).to be(true)
      expect(json["experience_count"]).to eq(1)
      expect(json["last_experienced_on"]).to eq(3.days.ago.to_date)
    end

    it "reads as not visited for an owner with no Experiences here" do
      create(:experience, restaurant: restaurant, user: somebody_else)

      json = restaurant.reload.as_json(owner: owner)

      expect(json["visited"]).to be(false)
      expect(json["experience_count"]).to eq(0)
      expect(json["last_experienced_on"]).to be_nil
    end

    # Defaulting would quietly report somebody else's counts on my card instead
    # of failing where the mistake was made.
    it "refuses to serialize without an owner" do
      expect { restaurant.as_json }.to raise_error(ArgumentError)
    end
  end
end
