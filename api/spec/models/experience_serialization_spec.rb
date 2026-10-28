require "rails_helper"

# Derived from shortlist.stack.md's JSON serialization row — "where a response
# differs from the row, an as_json override on the model" — and from the
# Enumerations section of shortlist.data.md, which fixes the rating at nine
# values held as a decimal.
RSpec.describe "An Experience on the wire" do
  let(:owner) { create(:user) }
  let(:restaurant) { create(:restaurant, user: owner, name: "Joe's Pizza") }

  def experience(attributes)
    build(:experience, { restaurant: restaurant, user: owner }.merge(attributes))
  end

  describe "rating" do
    # A decimal column would otherwise go out as the string "4.5". The wireframe
    # draws the number beside the stars and the control reads half-steps off it,
    # so what leaves here is the number shortlist.data.md says it is.
    Experience::RATINGS.each do |value|
      it "sends #{value.to_f} as a number" do
        json = experience(rating: value).as_json

        expect(json["rating"]).to eq(value.to_f)
        expect(json["rating"]).to be_a(Numeric)
      end
    end

    # No rating at all is not a score of nought — see the rating control in
    # managing-experiences.wireframe.drawio.svg.
    it "sends no rating as null rather than zero" do
      json = experience(rating: nil, notes: "Suadero sold out by 8pm").as_json

      expect(json["rating"]).to be_nil
    end
  end

  # The rest of the attribute table goes out as it stands, so this is the one
  # check that the override did not drop anything on its way past.
  it "carries the rest of the attribute table" do
    json = experience(
      rating: 4.5,
      notes: "The mafaldini is the whole reason to come",
      occurred_on: Date.new(2026, 10, 18)
    ).tap(&:save!).as_json

    expect(json["id"]).to be_present
    expect(json["restaurant_id"]).to eq(restaurant.id)
    expect(json["user_id"]).to eq(owner.id)
    expect(json["notes"]).to eq("The mafaldini is the whole reason to come")
    # A date goes out as a date, which in JSON is a string.
    expect(json["occurred_on"]).to eq("2026-10-18")
    expect(json["recorded_at"]).to be_present
    expect(json["updated_at"]).to be_present
  end
end
