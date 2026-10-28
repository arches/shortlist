require "rails_helper"

# Derived from shortlist.data.md: the Restaurant attribute table, its identity
# rule, the two invariants that name a Restaurant, and the note that removed_at
# never leaves the system. The link scheme cases come from the Scenario Outline
# in managing-my-list.scenarios.md.
RSpec.describe Restaurant do
  let(:owner) { create(:user) }

  it "needs a name and nothing else" do
    expect(build(:restaurant, user: owner, name: "Lilia")).to be_valid
  end

  it "is valid with everything an owner might know about it" do
    expect(build(:restaurant, :with_everything, user: owner)).to be_valid
  end

  describe "name" do
    it "rejects a Restaurant with no name" do
      restaurant = build(:restaurant, user: owner, name: nil)

      expect(restaurant).not_to be_valid
      expect(restaurant.errors[:name]).to be_present
    end

    # shortlist.data.md, Invariants: a name, once trimmed, is at least one
    # character. Whitespace alone is not a name.
    it "rejects a name that is only whitespace" do
      restaurant = build(:restaurant, user: owner, name: "   ")

      expect(restaurant).not_to be_valid
      expect(restaurant.errors[:name]).to be_present
    end

    it "stores the name trimmed" do
      restaurant = create(:restaurant, user: owner, name: "  Lilia  ")

      expect(restaurant.reload.name).to eq("Lilia")
    end

    it "rejects a name longer than 255 characters" do
      restaurant = build(:restaurant, user: owner, name: "a" * 256)

      expect(restaurant).not_to be_valid
      expect(restaurant.errors[:name]).to be_present
    end

    it "accepts a name of exactly 255 characters" do
      expect(build(:restaurant, user: owner, name: "a" * 255)).to be_valid
    end
  end

  describe "owner" do
    it "rejects a Restaurant with no owner" do
      restaurant = build(:restaurant, user: nil)

      expect(restaurant).not_to be_valid
      expect(restaurant.errors[:user]).to be_present
    end
  end

  # shortlist.data.md, Identity: name, case- and whitespace-insensitive, within
  # one owner's non-removed Restaurants.
  describe "identity" do
    it "rejects a second Restaurant of the same name on one owner's list" do
      create(:restaurant, user: owner, name: "Joe's Pizza")
      duplicate = build(:restaurant, user: owner, name: "Joe's Pizza")

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:name]).to be_present
    end

    it "rejects one differing only in case and surrounding whitespace" do
      create(:restaurant, user: owner, name: "Joe's Pizza")
      duplicate = build(:restaurant, user: owner, name: "  joe's PIZZA ")

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:name]).to be_present
    end

    # A name is reusable once the Restaurant carrying it is Removed, because a
    # Removed Restaurant is invisible.
    it "frees the name once the Restaurant carrying it is removed" do
      create(:restaurant, :removed, user: owner, name: "Joe's Pizza")

      expect(build(:restaurant, user: owner, name: "Joe's Pizza")).to be_valid
    end

    # Names are not unique across owners.
    it "lets two owners keep a Restaurant of the same name" do
      create(:restaurant, user: owner, name: "Joe's Pizza")

      expect(build(:restaurant, user: create(:user), name: "Joe's Pizza")).to be_valid
    end

    it "is enforced in the database as well as the model" do
      create(:restaurant, user: owner, name: "Joe's Pizza")
      duplicate = build(:restaurant, user: owner, name: "JOE'S PIZZA", added_at: Time.current)

      expect { duplicate.save!(validate: false) }
        .to raise_error(ActiveRecord::RecordNotUnique)
    end
  end

  # Scenario Outline: Giving a restaurant a link that is not a web address
  describe "links" do
    Restaurant::URL_ATTRIBUTES.each do |attribute|
      context "on #{attribute}" do
        [
          [ "javascript:alert(1)", "not a web address, and it gets rendered" ],
          [ "data:text/html,<h1>hi</h1>", "same" ],
          [ "mailto:hi@lilianewyork.com", "a web address is what this field means" ]
        ].each do |link, why|
          it "rejects #{link} — #{why}" do
            restaurant = build(:restaurant, user: owner, attribute => link)

            expect(restaurant).not_to be_valid
            expect(restaurant.errors[attribute]).to be_present
          end
        end

        it "rejects a value longer than 2048 characters" do
          long = "https://example.com/#{'a' * 2048}"
          restaurant = build(:restaurant, user: owner, attribute => long)

          expect(restaurant).not_to be_valid
          expect(restaurant.errors[attribute]).to be_present
        end

        it "accepts an http address" do
          expect(build(:restaurant, user: owner, attribute => "http://lilianewyork.com")).to be_valid
        end

        it "accepts an https address" do
          expect(build(:restaurant, user: owner, attribute => "https://lilianewyork.com/menu")).to be_valid
        end

        it "accepts no value at all" do
          expect(build(:restaurant, user: owner, attribute => nil)).to be_valid
        end
      end
    end
  end

  describe "the optional short text attributes" do
    Restaurant::SHORT_TEXT_ATTRIBUTES.each do |attribute|
      it "accepts #{attribute} being absent" do
        expect(build(:restaurant, user: owner, attribute => nil)).to be_valid
      end

      it "rejects #{attribute} longer than 255 characters" do
        restaurant = build(:restaurant, user: owner, attribute => "a" * 256)

        expect(restaurant).not_to be_valid
        expect(restaurant.errors[attribute]).to be_present
      end
    end

    it "accepts notes of any length" do
      expect(build(:restaurant, user: owner, notes: "a" * 10_000)).to be_valid
    end
  end

  describe "added_at" do
    it "is set when the Restaurant goes on the list" do
      freeze_time do
        expect(create(:restaurant, user: owner).added_at).to eq(Time.current)
      end
    end

    it "is left alone by a later edit" do
      restaurant = create(:restaurant, user: owner, added_at: 2.years.ago)

      restaurant.update!(cuisine: "Italian")

      expect(restaurant.reload.added_at).to be_within(1.second).of(2.years.ago)
    end
  end

  describe "removed" do
    it "is what the presence of removed_at means" do
      expect(create(:restaurant, user: owner)).not_to be_removed
      expect(create(:restaurant, :removed, user: owner)).to be_removed
    end

    it "takes the Restaurant off the list" do
      kept = create(:restaurant, user: owner)
      create(:restaurant, :removed, user: owner)

      expect(owner.restaurants.on_the_list).to contain_exactly(kept)
    end
  end

  # shortlist.data.md: removed_at never leaves the system in any response.
  it "never serializes removed_at" do
    restaurant = create(:restaurant, :removed, user: owner)

    expect(restaurant.as_json).not_to include("removed_at")
    expect(restaurant.to_json).not_to include("removed_at")
  end

  # shortlist.data.md, Ownership: deleting a User cascades to their Restaurants.
  it "is destroyed with its User" do
    create(:restaurant, user: owner)

    expect { owner.destroy }.to change(Restaurant, :count).by(-1)
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
