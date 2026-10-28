require "rails_helper"

# Derived from shortlist.data.md: the List item attribute table, its identity
# rule, and the Ownership statements about what a removal touches.
RSpec.describe ListItem do
  it "is valid with a List and a Restaurant" do
    expect(build(:list_item)).to be_valid
  end

  describe "required attributes" do
    it "rejects a List item with no List" do
      item = build(:list_item, list: nil)

      expect(item).not_to be_valid
      expect(item.errors[:list]).to be_present
    end

    it "rejects a List item with no Restaurant" do
      item = build(:list_item, restaurant: nil)

      expect(item).not_to be_valid
      expect(item.errors[:restaurant]).to be_present
    end
  end

  describe "added_at" do
    it "records when the owner put the Restaurant on the List" do
      freeze_time do
        expect(create(:list_item).added_at).to eq(Time.current)
      end
    end

    it "keeps a value it was given" do
      added = 3.days.ago.change(usec: 0)

      expect(create(:list_item, added_at: added).added_at).to eq(added)
    end
  end

  # shortlist.data.md, Identity: a List item is its List and its Restaurant
  # together. One List never holds the same Restaurant twice.
  describe "identity" do
    it "rejects the same Restaurant twice on one List" do
      item = create(:list_item)
      duplicate = build(:list_item, list: item.list, restaurant: item.restaurant)

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:restaurant_id]).to include("is already on your list")
    end

    it "accepts one Restaurant on two different Lists" do
      item = create(:list_item)

      expect(build(:list_item, list: create(:list), restaurant: item.restaurant)).to be_valid
    end

    it "accepts two different Restaurants on one List" do
      item = create(:list_item)

      expect(build(:list_item, list: item.list, restaurant: create(:restaurant))).to be_valid
    end
  end

  # shortlist.data.md, Ownership: removing a list item destroys that row and
  # nothing else. The Restaurant stands.
  describe "removing a List item" do
    it "destroys that row and leaves the Restaurant standing" do
      item = create(:list_item)

      item.destroy!

      expect(ListItem.exists?(item.id)).to be(false)
      expect(item.restaurant.reload).to be_persisted
    end
  end
end
