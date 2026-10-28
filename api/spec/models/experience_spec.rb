require "rails_helper"

# Derived from shortlist.data.md: the Experience attribute table, the Enumerations
# section, and the four invariants that name an Experience. The HTTP surface an
# owner reaches these through is managing-experiences.scenarios.md, and its specs
# live under spec/requests/api — what is checked here is the record itself.
RSpec.describe Experience do
  let(:owner) { create(:user) }
  let(:restaurant) { create(:restaurant, on_the_list_of: owner, name: "Joe's Pizza") }

  it "is valid with a rating, a note and a date" do
    expect(build(:experience, restaurant: restaurant, user: owner)).to be_valid
  end

  describe "required attributes" do
    it "rejects an Experience with no restaurant" do
      experience = build(:experience, restaurant: nil, user: owner)

      expect(experience).not_to be_valid
      expect(experience.errors[:restaurant]).to be_present
    end

    it "rejects an Experience with no owner" do
      experience = build(:experience, restaurant: restaurant, user: nil)

      expect(experience).not_to be_valid
      expect(experience.errors[:user]).to be_present
    end
  end

  # shortlist.data.md, Invariants: an Experience carries at least one of rating,
  # notes or occurred_on. All three absent is not an Experience.
  describe "saying something" do
    it "rejects an Experience with no rating, no notes and no date" do
      experience = build(:experience, restaurant: restaurant, user: owner,
        rating: nil, notes: nil, occurred_on: nil)

      expect(experience).not_to be_valid
      expect(experience.errors[:base]).to be_present
    end

    it "accepts an Experience that carries only a rating" do
      expect(build(:experience, restaurant: restaurant, user: owner,
        notes: nil, occurred_on: nil)).to be_valid
    end

    it "accepts an Experience that carries only a note" do
      expect(build(:experience, restaurant: restaurant, user: owner,
        rating: nil, occurred_on: nil)).to be_valid
    end

    it "accepts an Experience that carries only a date" do
      expect(build(:experience, restaurant: restaurant, user: owner,
        rating: nil, notes: nil)).to be_valid
    end
  end

  # shortlist.data.md, Enumerations: exactly one of nine values. Nine values, no
  # zero, and can be empty.
  describe "rating" do
    Experience::RATINGS.each do |value|
      it "accepts #{value.to_f}" do
        expect(build(:experience, restaurant: restaurant, user: owner, rating: value)).to be_valid
      end
    end

    it "accepts no rating at all" do
      expect(build(:experience, restaurant: restaurant, user: owner, rating: nil)).to be_valid
    end

    it "rejects a rating off the half-star steps" do
      experience = build(:experience, restaurant: restaurant, user: owner, rating: 3.7)

      expect(experience).not_to be_valid
      expect(experience.errors[:rating]).to be_present
    end

    it "rejects zero, which is not one of the nine" do
      experience = build(:experience, restaurant: restaurant, user: owner, rating: 0)

      expect(experience).not_to be_valid
      expect(experience.errors[:rating]).to be_present
    end

    it "rejects a rating above five" do
      experience = build(:experience, restaurant: restaurant, user: owner, rating: 5.5)

      expect(experience).not_to be_valid
      expect(experience.errors[:rating]).to be_present
    end

    it "keeps the half-star as a number" do
      experience = create(:experience, restaurant: restaurant, user: owner, rating: 4.5)

      expect(experience.reload.rating).to eq(BigDecimal("4.5"))
    end
  end

  # shortlist.data.md, Invariants: occurred_on is never later than the day it is
  # recorded. A future date is a typo rather than a booking.
  describe "occurred_on" do
    it "rejects a date after the day it is recorded" do
      experience = build(:experience, restaurant: restaurant, user: owner,
        occurred_on: Date.current + 1)

      expect(experience).not_to be_valid
      expect(experience.errors[:occurred_on]).to be_present
    end

    it "accepts the day it is recorded" do
      expect(build(:experience, restaurant: restaurant, user: owner,
        occurred_on: Date.current)).to be_valid
    end

    it "accepts no date at all" do
      expect(build(:experience, restaurant: restaurant, user: owner, occurred_on: nil)).to be_valid
    end

    # Recording an Experience that happened long before the Restaurant went on
    # the List is normal, and deliberately allowed.
    it "accepts a date earlier than the List item's added_at" do
      old = create(:restaurant, on_the_list_of: owner)
      old.list_items.sole.update!(added_at: 1.week.ago)

      expect(build(:experience, restaurant: old, user: owner,
        occurred_on: 5.years.ago.to_date)).to be_valid
    end
  end

  describe "recorded_at" do
    it "is set when the owner writes it down" do
      freeze_time do
        experience = create(:experience, restaurant: restaurant, user: owner)

        expect(experience.recorded_at).to eq(Time.current)
      end
    end

    it "is not necessarily when it happened" do
      experience = create(:experience, restaurant: restaurant, user: owner,
        occurred_on: 3.years.ago.to_date)

      expect(experience.recorded_at.to_date).to eq(Date.current)
      expect(experience.occurred_on).to eq(3.years.ago.to_date)
    end
  end

  # shortlist.data.md, Ownership: an Experience has exactly one owner, and
  # deleting a User deletes their experiences. Nothing erases restaurants, so
  # there is no path by which a Restaurant takes one with it.
  describe "ownership" do
    it "is destroyed with its User" do
      create(:experience, restaurant: restaurant, user: owner)

      expect { owner.destroy }.to change(Experience, :count).by(-1)
    end

    # An Experience does not require a List item. Removing a Restaurant from a
    # List leaves that owner's Experiences standing, out of reach until it goes
    # back on.
    it "stands when the owner takes the Restaurant off their list" do
      create(:experience, restaurant: restaurant, user: owner)

      expect { restaurant.list_items.sole.destroy! }.not_to change(Experience, :count)
    end
  end
end
