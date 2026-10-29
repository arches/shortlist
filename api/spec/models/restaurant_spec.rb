require "rails_helper"

# Derived from shortlist.data.md: the Restaurant attribute table and its
# identity rule. A Restaurant is a wrapper for a Google Place now, shared by
# every List that holds it, so what used to be owner-scoped here is on the List
# item instead — see list_item_spec.rb.
RSpec.describe Restaurant do
  let(:owner) { create(:user) }

  it "needs a google place id and a name" do
    expect(build(:restaurant, on_the_list_of: owner, name: "Lilia")).to be_valid
  end

  it "is valid with everything Google knows about it" do
    expect(build(:restaurant, :with_everything, on_the_list_of: owner)).to be_valid
  end

  describe "name" do
    it "rejects a Restaurant with no name" do
      restaurant = build(:restaurant, on_the_list_of: owner, name: nil)

      expect(restaurant).not_to be_valid
      expect(restaurant.errors[:name]).to be_present
    end

    # shortlist.data.md, Invariants: a name, once trimmed, is at least one
    # character. Whitespace alone is not a name.
    it "rejects a name that is only whitespace" do
      restaurant = build(:restaurant, on_the_list_of: owner, name: "   ")

      expect(restaurant).not_to be_valid
      expect(restaurant.errors[:name]).to be_present
    end

    it "stores the name trimmed" do
      restaurant = create(:restaurant, on_the_list_of: owner, name: "  Lilia  ")

      expect(restaurant.reload.name).to eq("Lilia")
    end

    it "rejects a name longer than 255 characters" do
      restaurant = build(:restaurant, on_the_list_of: owner, name: "a" * 256)

      expect(restaurant).not_to be_valid
      expect(restaurant.errors[:name]).to be_present
    end

    it "accepts a name of exactly 255 characters" do
      expect(build(:restaurant, on_the_list_of: owner, name: "a" * 255)).to be_valid
    end
  end

  # shortlist.data.md, Identity: its google place id. ADR 0001 is what put it
  # there — one row per Place for the whole system, which is the deduplication
  # within one List and across every List there is.
  describe "identity" do
    it "rejects a Restaurant with no google place id" do
      restaurant = build(:restaurant, google_place_id: nil)

      expect(restaurant).not_to be_valid
      expect(restaurant.errors[:google_place_id]).to be_present
    end

    it "rejects a second Restaurant for the same Place" do
      create(:restaurant, google_place_id: "ChIJrTLr-GyuEmsRBfy61i59si0")
      duplicate = build(:restaurant, google_place_id: "ChIJrTLr-GyuEmsRBfy61i59si0")

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:google_place_id]).to be_present
    end

    it "is enforced in the database as well as the model" do
      create(:restaurant, google_place_id: "ChIJrTLr")
      duplicate = build(:restaurant, google_place_id: "ChIJrTLr")

      expect { duplicate.save!(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    # Opaque and case-sensitive. A Place ID differing in case is a different
    # Place, not the same one typed badly.
    it "treats a Place ID differing only in case as a different Place" do
      create(:restaurant, google_place_id: "ChIJrTLr")

      expect(build(:restaurant, google_place_id: "chijrtlr")).to be_valid
    end

    # The name is cached from Google rather than typed, so it identifies
    # nothing. Two Places may share one, and two Lists share one row.
    it "accepts a second Restaurant of the same name" do
      create(:restaurant, name: "Joe's Pizza")

      expect(build(:restaurant, name: "Joe's Pizza")).to be_valid
    end
  end

  describe "the optional short text attributes" do
    Restaurant::SHORT_TEXT_ATTRIBUTES.each do |attribute|
      it "accepts #{attribute} being absent" do
        expect(build(:restaurant, on_the_list_of: owner, attribute => nil)).to be_valid
      end

      it "rejects #{attribute} longer than 255 characters" do
        restaurant = build(:restaurant, on_the_list_of: owner, attribute => "a" * 256)

        expect(restaurant).not_to be_valid
        expect(restaurant.errors[attribute]).to be_present
      end
    end
  end

  # shortlist.data.md, Ownership: nothing erases restaurants. A Restaurant
  # outlives every List item that points at it, and the foreign key is what
  # refuses — there is no application path that tries.
  describe "erasing a Restaurant" do
    it "is refused while a List item points at it" do
      item = create(:list_item)

      expect { item.restaurant.destroy }.to raise_error(ActiveRecord::InvalidForeignKey)
    end
  end
end
