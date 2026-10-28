require "rails_helper"

# Derived from shortlist.data.md: the List attribute table, its identity rule,
# and the invariant that names the default list.
RSpec.describe List do
  it "is valid with a name and an owner" do
    expect(build(:list)).to be_valid
  end

  describe "required attributes" do
    it "rejects a List with no name" do
      list = build(:list, name: nil)

      expect(list).not_to be_valid
      expect(list.errors[:name]).to be_present
    end

    it "rejects a List whose name is only whitespace" do
      list = build(:list, name: "   ")

      expect(list).not_to be_valid
      expect(list.errors[:name]).to be_present
    end

    it "rejects a List with no owner" do
      list = build(:list, user: nil)

      expect(list).not_to be_valid
      expect(list.errors[:user]).to be_present
    end
  end

  describe "name" do
    it "stores the name trimmed" do
      list = create(:list, name: "  Places to try  ")

      expect(list.reload.name).to eq("Places to try")
    end

    it "rejects a name longer than 255 characters" do
      list = build(:list, name: "a" * 256)

      expect(list).not_to be_valid
      expect(list.errors[:name]).to be_present
    end

    it "accepts a name of exactly 255 characters" do
      expect(build(:list, name: "a" * 255)).to be_valid
    end
  end

  # shortlist.data.md, Identity: its name, scoped per user.
  describe "identity" do
    it "rejects a second List of the same name for one owner" do
      owner = create(:user)
      create(:list, user: owner, name: "Places to try")
      duplicate = build(:list, user: owner, name: "Places to try")

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:name]).to be_present
    end

    it "accepts the same name on another owner's List" do
      create(:list, user: create(:user), name: "Places to try")

      expect(build(:list, user: create(:user), name: "Places to try")).to be_valid
    end
  end

  # A List owns its List items. The Restaurants they point at are shared, so
  # they stand.
  describe "discarding a List" do
    it "discards its List items and leaves the Restaurants standing" do
      item = create(:list_item)

      expect { item.list.destroy! }.to change(ListItem, :count).by(-1)
      expect(item.restaurant.reload).to be_persisted
    end
  end
end
