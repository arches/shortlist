require "rails_helper"

# Derived from managing-my-list.scenarios.md and the wireframe's list screen:
# each card reads a name, a cuisine, whether it is visited, and how many
# experiences it has.
RSpec.describe "GET /api/restaurants" do
  let(:owner) { create(:user, email: "sam.reed@fastmail.com") }

  def get_the_list(headers = headers_for(owner))
    get "/api/restaurants", headers: headers, as: :json
  end

  describe "when I am signed in" do
    it "opens my list" do
      create(:restaurant, user: owner, name: "Lilia")

      get_the_list

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.map { |r| r["name"] }).to eq([ "Lilia" ])
    end

    it "is empty before anything is on it" do
      get_the_list

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq([])
    end

    it "carries what the card shows for a restaurant only heard the name of" do
      create(:restaurant, user: owner, name: "Lilia", cuisine: "Italian")

      get_the_list

      expect(response.parsed_body.sole).to include(
        "name" => "Lilia",
        "cuisine" => "Italian",
        "visited" => false,
        "experience_count" => 0
      )
    end

    it "reads as visited, with a count, once it has experiences" do
      restaurant = create(:restaurant, user: owner, name: "Tacos El Bronco", cuisine: "Mexican")
      create_list(:experience, 2, restaurant: restaurant, user: owner)

      get_the_list

      expect(response.parsed_body.sole).to include(
        "cuisine" => "Mexican",
        "visited" => true,
        "experience_count" => 2
      )
    end

    it "carries every detail an owner filled in" do
      create(:restaurant, :with_everything, user: owner)

      get_the_list

      expect(response.parsed_body.sole).to include(
        "name" => "Tacos El Bronco",
        "cuisine" => "Mexican",
        "specialty" => "Suadero tacos",
        "address_line_1" => "4324 4th Ave",
        "city" => "Brooklyn",
        "state" => "NY",
        "postal_code" => "11232",
        "url" => "https://tacoselbronco.com",
        "notes" => "Cash only, closes early"
      )
    end

    # shortlist.data.md: removed_at never leaves the system in any response.
    it "never reveals removed_at" do
      create(:restaurant, user: owner, name: "Lilia")

      get_the_list

      expect(response.body).not_to include("removed_at")
    end
  end

  # Scenario: Taking a restaurant off my list that I have visited — "nothing
  # named Joe's Pizza is on my list".
  it "leaves out the restaurants I have taken off my list" do
    create(:restaurant, user: owner, name: "Lilia")
    create(:restaurant, :removed, user: owner, name: "Joe's Pizza")

    get_the_list

    expect(response.parsed_body.map { |r| r["name"] }).to eq([ "Lilia" ])
  end

  # Scenario: Two owners keeping the same restaurant — nothing connects the two
  # entries, and a list is private to its owner.
  it "shows me only my own restaurants" do
    create(:restaurant, user: owner, name: "Lilia")
    create(:restaurant, user: create(:user), name: "Joe's Pizza")

    get_the_list

    expect(response.parsed_body.map { |r| r["name"] }).to eq([ "Lilia" ])
  end

  # Scenario: Managing my list while signed out
  describe "when my session has ended" do
    it "asks me to sign in" do
      create(:restaurant, user: owner, name: "Lilia")

      get_the_list({})

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]).to eq("Sign in to continue.")
    end

    it "asks me to sign in once my access token has expired" do
      get_the_list(auth_headers(AccessToken.issue(user: owner, at: 16.minutes.ago)))

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
