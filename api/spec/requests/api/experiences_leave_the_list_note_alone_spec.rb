require "rails_helper"

# managing-experiences.scenarios.md: "The note on an experience is what the
# owner thought after eating. The note on a list item is why the restaurant is
# on the list in the first place. Writing one never touches the other."
#
# shortlist.data.md says the same thing as an invariant: a List item's note is
# independent of the owner's Experiences at that Restaurant, and recording,
# changing or removing an Experience neither fills nor clears it.
#
# One word covers two things, which is why this is its own file rather than a
# line in each of the three experience specs: what it checks is that the two
# never meet, and that is one claim about three verbs.
RSpec.describe "Experiences and the list note" do
  let(:owner) { create(:user, email: "sam.reed@fastmail.com") }

  let(:restaurant) do
    create(
      :restaurant,
      on_the_list_of: owner,
      name: "Joe's Pizza",
      with_the_note: "Go for the plain slice"
    )
  end

  def the_list_note
    owner.lists.sole.list_items.sole.reload.note
  end

  it "leaves the list note alone when an experience is recorded" do
    post "/api/restaurants/#{restaurant.id}/experiences",
      params: { experience: { notes: "Corner slice, still the best one" } },
      headers: headers_for(owner),
      as: :json

    expect(response).to have_http_status(:created)
    expect(the_list_note).to eq("Go for the plain slice")
  end

  it "leaves the list note alone when an experience's note is changed" do
    experience = create(:experience, restaurant: restaurant, user: owner, notes: "Queue out the door")

    patch "/api/restaurants/#{restaurant.id}/experiences/#{experience.id}",
      params: { experience: { notes: "No queue at 3pm" } },
      headers: headers_for(owner),
      as: :json

    expect(response).to have_http_status(:ok)
    expect(the_list_note).to eq("Go for the plain slice")
  end

  it "leaves the list note alone when an experience is removed" do
    experience = create(:experience, restaurant: restaurant, user: owner, rating: 3)

    delete "/api/restaurants/#{restaurant.id}/experiences/#{experience.id}",
      headers: headers_for(owner),
      as: :json

    expect(response).to have_http_status(:no_content)
    expect(the_list_note).to eq("Go for the plain slice")
  end

  # And the other way round, which is the half the invariant's wording makes
  # easy to miss: writing a list note is not a way to edit what the owner
  # thought of a meal.
  it "leaves an experience's notes alone when the list note is written" do
    experience = create(:experience, restaurant: restaurant, user: owner, notes: "Queue out the door")

    patch "/api/list/restaurants/#{restaurant.id}",
      params: { restaurant: { note: "Go before 7pm" } },
      headers: headers_for(owner),
      as: :json

    expect(response).to have_http_status(:ok)
    expect(experience.reload.notes).to eq("Queue out the door")
  end

  # "Removing a Restaurant from a List leaves that owner's Experiences
  # standing" — and takes the note with it, so the two go separate ways.
  it "keeps the experiences and loses the note when the restaurant comes off" do
    experience = create(:experience, restaurant: restaurant, user: owner, notes: "Queue out the door")

    delete "/api/list/restaurants/#{restaurant.id}", headers: headers_for(owner), as: :json

    expect(response).to have_http_status(:no_content)
    expect(experience.reload.notes).to eq("Queue out the door")
    expect(ListItem.count).to eq(0)
  end
end
