require "rails_helper"

# Derived from managing-my-list.scenarios.md, "Changing the note on a restaurant
# on my list" and its four examples. Background: I am signed in as the owner of
# my list.
#
# The route shape is an assumption — see ASSUMPTIONS.md, "How the note on a
# restaurant already on my list is changed".
RSpec.describe "PATCH /api/list/restaurants/:id" do
  let(:owner) { create(:user, email: "sam.reed@fastmail.com") }

  def set_the_note(restaurant, note, headers = headers_for(owner))
    patch "/api/list/restaurants/#{restaurant.id}",
      params: { restaurant: { note: note } },
      headers: headers,
      as: :json
  end

  def soban(note: nil)
    create(:restaurant, on_the_list_of: owner, name: "Soban", with_the_note: note)
  end

  # The four examples of the outline, each one a before and an after.
  describe "the four ways a note changes" do
    it "writes a note onto a restaurant carrying none" do
      restaurant = soban

      set_the_note(restaurant, "Famous for their bibimbap")

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["note"]).to eq("Famous for their bibimbap")
    end

    it "replaces a note with a different one" do
      restaurant = soban(note: "Famous for their bibimbap")

      set_the_note(restaurant, "Go before 7pm")

      expect(response.parsed_body["note"]).to eq("Go before 7pm")
    end

    # "Clearing a note is emptying it; there is no separate act of deleting one."
    it "clears a note set to nothing" do
      restaurant = soban(note: "Famous for their bibimbap")

      set_the_note(restaurant, "")

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["note"]).to be_nil
    end

    it "clears a note set to nothing but spaces" do
      restaurant = soban(note: "Famous for their bibimbap")

      set_the_note(restaurant, "   ")

      expect(response.parsed_body["note"]).to be_nil
    end
  end

  # "And \"Soban\" is still on my list. And the day it went on my list has not
  # changed." Writing a note is not a re-add.
  describe "what a note never changes" do
    it "leaves the restaurant on my list" do
      restaurant = soban

      expect { set_the_note(restaurant, "Famous for their bibimbap") }
        .not_to change(ListItem, :count)

      expect(owner.restaurants.pluck(:name)).to eq([ "Soban" ])
    end

    it "leaves the day it went on my list alone" do
      restaurant = soban
      item = owner.lists.sole.list_items.sole
      item.update!(added_at: 3.days.ago.change(usec: 0))

      set_the_note(restaurant, "Famous for their bibimbap")

      expect(item.reload.added_at).to eq(3.days.ago.change(usec: 0))
    end

    # An edit overwrites. There is no history of the history.
    it "keeps no earlier version of the note" do
      restaurant = soban(note: "Famous for their bibimbap")

      set_the_note(restaurant, "Go before 7pm")

      expect(ListItem.sole.note).to eq("Go before 7pm")
    end

    # The Place ID is identity — ADR 0001 — and everything beside it is
    # Google's, so nothing but the note is settable here.
    it "ignores anything but the note" do
      restaurant = soban

      patch "/api/list/restaurants/#{restaurant.id}",
        params: { restaurant: { note: "Famous for their bibimbap",
                                google_place_id: "ChIJSomethingElse",
                                name: "Not Soban" } },
        headers: headers_for(owner),
        as: :json

      expect(restaurant.reload).to have_attributes(name: "Soban")
      expect(restaurant.google_place_id).not_to eq("ChIJSomethingElse")
    end

    # "Two owners holding the same Restaurant have independent notes, and
    # neither reads the other's."
    it "leaves another owner's note at the same Place alone" do
      restaurant = soban(note: "Go for the plain slice")
      theirs = create(:list_item, list: create(:user).lists.sole, restaurant: restaurant,
        note: "Ask for it well done")

      set_the_note(restaurant, "Go before 7pm")

      expect(theirs.reload.note).to eq("Ask for it well done")
    end
  end

  # The one refusal for everything outside my own list, shared with every other
  # path through RestaurantScope: telling the cases apart would let somebody
  # probe another owner's list for what is on it.
  describe "a restaurant I cannot reach" do
    it "reports a restaurant that is off my list as not found" do
      restaurant = create(:restaurant, name: "Bar Primi")

      set_the_note(restaurant, "Famous for their bibimbap")

      expect(response).to have_http_status(:not_found)
      expect(restaurant.list_items).to be_empty
    end

    it "reports another owner's restaurant as not found, and changes nothing" do
      restaurant = create(:restaurant, on_the_list_of: create(:user))
      theirs = restaurant.list_items.sole
      theirs.update!(note: "Ask for it well done")

      set_the_note(restaurant, "Famous for their bibimbap")

      expect(response).to have_http_status(:not_found)
      expect(theirs.reload.note).to eq("Ask for it well done")
    end

    it "reports a restaurant that was never on any list as not found" do
      set_the_note(Restaurant.new(id: 999_999), "Famous for their bibimbap")

      expect(response).to have_http_status(:not_found)
    end
  end

  # Scenario: Managing my list while signed out — "When I try to add, change or
  # remove a restaurant, or write a note".
  describe "when my session has ended" do
    it "asks me to sign in, and changes nothing" do
      restaurant = soban(note: "Famous for their bibimbap")

      set_the_note(restaurant, "Go before 7pm", {})

      expect(response).to have_http_status(:unauthorized)
      expect(ListItem.sole.note).to eq("Famous for their bibimbap")
    end
  end
end
