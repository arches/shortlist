require "rails_helper"

# shortlist.data.md: a List item's note is why that Restaurant is on that List,
# in the owner's words. It is a stored column rather than a derived value, but
# it is read the same way the derived three are — scoped to the owner asking,
# because the Restaurant row is shared by every List that holds it.
#
# managing-my-list.adding-a-restaurant.sequence.d2 is what puts it in the
# response: "the Restaurant with address and cuisine, and the List item's note".
RSpec.describe "A Restaurant's note" do
  let(:owner) { create(:user) }
  let(:somebody_else) { create(:user) }

  describe "note_for" do
    it "is absent for a Restaurant on the list with no note" do
      restaurant = create(:restaurant, on_the_list_of: owner)

      expect(restaurant.note_for(owner)).to be_nil
    end

    it "is what that owner wrote" do
      restaurant = create(
        :restaurant,
        on_the_list_of: owner,
        with_the_note: "Famous for their bibimbap"
      )

      expect(restaurant.note_for(owner)).to eq("Famous for their bibimbap")
    end

    # "A List item's note belongs to that List item alone. Two owners holding
    # the same Restaurant have independent notes, and neither reads the other's."
    it "is never another owner's note at the same Place" do
      restaurant = create(
        :restaurant,
        on_the_list_of: owner,
        with_the_note: "Go for the plain slice"
      )
      create(:list_item, list: somebody_else.lists.sole, restaurant: restaurant,
        note: "Ask for it well done")

      expect(restaurant.reload.note_for(owner)).to eq("Go for the plain slice")
      expect(restaurant.note_for(somebody_else)).to eq("Ask for it well done")
    end

    it "is absent for an owner who does not hold it at all" do
      restaurant = create(
        :restaurant,
        on_the_list_of: owner,
        with_the_note: "Famous for their bibimbap"
      )

      expect(restaurant.note_for(somebody_else)).to be_nil
    end
  end

  describe "as_json" do
    it "carries the note of the owner asking" do
      restaurant = create(
        :restaurant,
        on_the_list_of: owner,
        with_the_note: "Famous for their bibimbap"
      )

      expect(restaurant.as_json(owner: owner)).to include(
        "note" => "Famous for their bibimbap"
      )
    end

    it "carries a null note when the owner wrote none" do
      restaurant = create(:restaurant, on_the_list_of: owner)

      json = restaurant.as_json(owner: owner)

      expect(json).to have_key("note")
      expect(json["note"]).to be_nil
    end

    it "never carries another owner's note" do
      restaurant = create(
        :restaurant,
        on_the_list_of: owner,
        with_the_note: "Go for the plain slice"
      )
      create(:list_item, list: somebody_else.lists.sole, restaurant: restaurant,
        note: "Ask for it well done")

      expect(restaurant.reload.as_json(owner: somebody_else)).to include(
        "note" => "Ask for it well done"
      )
    end
  end
end
