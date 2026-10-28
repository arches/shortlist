require "rails_helper"

# Derived from signing-in.scenarios.md: "Staying on my list longer than an access
# token lasts", "Coming back after my refresh token has expired", and the rule
# that a refresh token is good for exactly one use.
RSpec.describe "POST /api/session/renewal" do
  let(:password) { "correct-horse-battery-staple" }
  let!(:owner) { create(:user, email: "sam.reed@fastmail.com", password: password) }

  def renew(refresh_token)
    post "/api/session/renewal", params: { refresh_token: refresh_token }, as: :json
  end

  # Scenario: Staying on my list longer than an access token lasts. Seen from
  # the API, renewal is what makes the owner notice nothing.
  describe "with a live refresh token" do
    it "issues a fresh pair" do
      presented = RefreshToken.issue(user: owner)

      renew(presented.token)

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["access_token"]).to be_present
      expect(response.parsed_body["refresh_token"]).to be_present
      expect(response.parsed_body["expires_in"]).to eq(15.minutes.to_i)
    end

    it "issues an access token that identifies the owner" do
      renew(RefreshToken.issue(user: owner).token)

      expect(AccessToken.owner(response.parsed_body["access_token"])).to eq(owner)
    end

    it "rotates the refresh token: the presented row is destroyed and one takes its place" do
      presented = RefreshToken.issue(user: owner)

      expect { renew(presented.token) }.not_to change(RefreshToken, :count)

      expect(RefreshToken.find_by(id: presented.id)).to be_nil
      expect(response.parsed_body["refresh_token"]).not_to eq(presented.token)
      expect(owner.refresh_tokens.sole.token).to eq(response.parsed_body["refresh_token"])
    end

    it "extends the ceiling, so an owner who uses the list weekly is never turned out" do
      presented = RefreshToken.issue(user: owner, at: 20.days.ago)

      renew(presented.token)

      expect(owner.refresh_tokens.sole.expires_at).to be_within(1.minute).of(30.days.from_now)
    end
  end

  # A refresh token is good for exactly one use.
  describe "with a refresh token that has already been spent" do
    it "refuses the second use" do
      presented = RefreshToken.issue(user: owner)
      renew(presented.token)

      renew(presented.token)

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]).to eq("That session cannot be renewed.")
    end

    it "issues nothing on the second use" do
      presented = RefreshToken.issue(user: owner)
      renew(presented.token)
      issued_by_the_first_renewal = owner.refresh_tokens.sole

      renew(presented.token)

      expect(owner.refresh_tokens.sole).to eq(issued_by_the_first_renewal)
      expect(response.parsed_body).not_to include("access_token")
    end
  end

  # Scenario: Coming back after my refresh token has expired
  describe "with a refresh token past its thirty days" do
    it "refuses, so the owner is asked to sign in" do
      presented = RefreshToken.issue(user: owner, at: 31.days.ago)

      renew(presented.token)

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]).to eq("That session cannot be renewed.")
    end

    it "spends the expired row anyway, so it cannot be presented again" do
      presented = RefreshToken.issue(user: owner, at: 31.days.ago)

      expect { renew(presented.token) }.to change(RefreshToken, :count).by(-1)
    end
  end

  describe "with a refresh token that was never issued" do
    it "refuses in the same words as a spent one" do
      renew("no-such-token")

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]).to eq("That session cannot be renewed.")
    end
  end

  describe "with no refresh token at all" do
    it "refuses" do
      post "/api/session/renewal", params: {}, as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
