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

  # shortlist.data.md, Invariants: a List item's note is trimmed, and one that is
  # empty or nothing but whitespace is stored as absent. The note is why the
  # Restaurant is on the List, in the owner's words, and it is optional.
  describe "note" do
    it "accepts a List item carrying no note" do
      item = create(:list_item)

      expect(item).to be_valid
      expect(item.note).to be_nil
    end

    it "keeps what the owner wrote" do
      item = create(:list_item, note: "Famous for their bibimbap")

      expect(item.note).to eq("Famous for their bibimbap")
    end

    it "trims what the owner wrote" do
      item = create(:list_item, note: "  Famous for their bibimbap\n")

      expect(item.note).to eq("Famous for their bibimbap")
    end

    it "stores an empty note as absent" do
      expect(create(:list_item, note: "").note).to be_nil
    end

    # "Clearing a note is emptying it; there is no separate act of deleting one."
    it "stores a note of nothing but whitespace as absent" do
      expect(create(:list_item, note: "   \t\n ").note).to be_nil
    end

    # shortlist.data.md types it as "long text, trimmed" and bounds it nowhere,
    # where the same table bounds its short text at 255 — see ASSUMPTIONS.md,
    # "How long a note may be".
    it "accepts a note longer than any short text on the model" do
      note = "a" * 5_000

      expect(create(:list_item, note: note).note).to eq(note)
    end

    # "A List item's note belongs to that List item alone. Two owners holding
    # the same Restaurant have independent notes, and neither reads the other's."
    it "is independent of another owner's note at the same Restaurant" do
      restaurant = create(:restaurant)
      mine = create(:list_item, restaurant: restaurant, note: "Go for the plain slice")
      theirs = create(:list_item, restaurant: restaurant, note: "Ask for it well done")

      expect(mine.reload.note).to eq("Go for the plain slice")
      expect(theirs.reload.note).to eq("Ask for it well done")
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

    # shortlist.data.md, Ownership: removing a list item destroys that row and
    # nothing else, its note included, and putting the Restaurant back on the
    # List starts with no note.
    it "takes the note with it, so the Restaurant goes back on with none" do
      item = create(:list_item, note: "Famous for their bibimbap")
      list = item.list
      restaurant = item.restaurant

      item.destroy!

      expect(create(:list_item, list: list, restaurant: restaurant).note).to be_nil
    end
  end
end
