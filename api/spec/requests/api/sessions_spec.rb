require "rails_helper"

# Derived from signing-in.scenarios.md: the main path, and the Scenario Outline
# "Credentials that do not match an account" with all three of its rows.
RSpec.describe "POST /api/session" do
  # Background: an administrator has created an account for this address.
  let(:password) { "correct-horse-battery-staple" }
  let!(:owner) { create(:user, email: "sam.reed@fastmail.com", password: password) }

  def sign_in(email:, password:)
    post "/api/session", params: { email: email, password: password }, as: :json
  end

  # Scenario: Signing in to reach my list
  describe "with the right credentials" do
    it "issues a token pair" do
      sign_in(email: "sam.reed@fastmail.com", password: password)

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["access_token"]).to be_present
      expect(response.parsed_body["refresh_token"]).to be_present
    end

    it "issues an access token that identifies the owner" do
      sign_in(email: "sam.reed@fastmail.com", password: password)

      expect(AccessToken.owner(response.parsed_body["access_token"])).to eq(owner)
    end

    it "says how long the access token lasts, which is about fifteen minutes" do
      sign_in(email: "sam.reed@fastmail.com", password: password)

      expect(response.parsed_body["expires_in"]).to eq(15.minutes.to_i)
    end

    it "records a refresh token for the owner, good for thirty days" do
      expect { sign_in(email: "sam.reed@fastmail.com", password: password) }
        .to change { owner.refresh_tokens.count }.by(1)

      issued = owner.refresh_tokens.sole
      expect(response.parsed_body["refresh_token"]).to eq(issued.token)
      expect(issued.expires_at).to be_within(1.minute).of(30.days.from_now)
    end

    it "accepts the address however it was typed" do
      sign_in(email: "  SAM.REED@Fastmail.com ", password: password)

      expect(response).to have_http_status(:created)
    end
  end

  # Scenario Outline: Credentials that do not match an account
  describe "with credentials that do not match an account" do
    refusals = [
      [ "my account, the wrong password", "sam.reed@fastmail.com", "hunter2" ],
      [ "no account at that address", "nobody@fastmail.com", "correct-horse-battery-staple" ],
      [ "neither matches anything", "nobody@fastmail.com", "hunter2" ]
    ]

    refusals.each do |why, email, attempted|
      it "refuses, where #{why}" do
        sign_in(email: email, password: attempted)

        expect(response).to have_http_status(:unauthorized)
        expect(response.parsed_body["error"]).to eq("The email or password is wrong.")
      end

      it "issues nothing, where #{why}" do
        expect { sign_in(email: email, password: attempted) }
          .not_to change(RefreshToken, :count)

        expect(response.parsed_body).not_to include("access_token")
        expect(response.parsed_body).not_to include("refresh_token")
      end
    end

    # "I am not told which of the two it was. I am not told whether the email has
    # an account at all." One body, byte for byte, whichever of the three it was.
    it "returns one identical refusal for all three causes" do
      bodies = refusals.map do |_why, email, attempted|
        sign_in(email: email, password: attempted)
        [ response.status, response.body ]
      end

      expect(bodies.uniq.length).to eq(1)
    end

    # "the same string, produced by the same path, taking the same time". An
    # address with no account still costs a password comparison, so the refusal
    # cannot be timed to tell the two apart.
    it "compares a password even when no account exists at the address" do
      expect(BCrypt::Engine).to receive(:hash_secret).at_least(:once).and_call_original

      sign_in(email: "nobody@fastmail.com", password: "hunter2")

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "with nothing at all" do
    it "refuses in the same words" do
      post "/api/session", params: {}, as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]).to eq("The email or password is wrong.")
    end
  end
end
