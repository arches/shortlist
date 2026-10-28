require "rails_helper"

# Derived from signing-in.scenarios.md: "Signing out when I am done", "Signing
# out on one device while signed in on another", and the prose about what a
# request carries and what a refusal of one means.
RSpec.describe "DELETE /api/session" do
  let(:password) { "correct-horse-battery-staple" }
  let!(:owner) { create(:user, email: "sam.reed@fastmail.com", password: password) }

  def sign_out(headers)
    delete "/api/session", headers: headers, as: :json
  end

  def renew(refresh_token)
    post "/api/session/renewal", params: { refresh_token: refresh_token }, as: :json
  end

  # Scenario: Signing out when I am done
  describe "when I am signed in" do
    it "signs me out" do
      sign_out(headers_for(owner))

      expect(response).to have_http_status(:no_content)
    end

    it "leaves the account able to sign in again with the same password" do
      sign_out(headers_for(owner))

      post "/api/session", params: { email: owner.email, password: password }, as: :json

      expect(response).to have_http_status(:created)
    end
  end

  # Scenario: Signing out on one device while signed in on another
  describe "when I am signed in on my laptop and on my phone" do
    let(:laptop) { RefreshToken.issue(user: owner) }
    let(:phone) { RefreshToken.issue(user: owner) }

    it "destroys every refresh token the owner has, not just the one signing out" do
      laptop
      phone

      sign_out(headers_for(owner))

      expect(owner.refresh_tokens.reload).to be_empty
    end

    it "stops my phone renewing its session" do
      laptop
      phone_token = phone.token

      sign_out(headers_for(owner))
      renew(phone_token)

      expect(response).to have_http_status(:unauthorized)
    end

    # The honest reading from the artifact: signing out is true of renewals
    # immediately and of requests within fifteen minutes. The phone is asked to
    # sign in only once its access token expires, so until then its requests
    # still go through.
    it "leaves my phone's unexpired access token working until it expires" do
      phone_access_token = AccessToken.issue(user: owner)

      sign_out(headers_for(owner))
      sign_out(auth_headers(phone_access_token))

      expect(response).to have_http_status(:no_content)
    end
  end

  it "leaves another owner's sessions alone" do
    other = create(:user)
    RefreshToken.issue(user: other)

    sign_out(headers_for(owner))

    expect(other.refresh_tokens.reload.count).to eq(1)
  end

  # Every request carries an access token, and Shortlist verifies it itself.
  describe "without a usable access token" do
    it "refuses a request that carries none" do
      sign_out({})

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]).to eq("Sign in to continue.")
    end

    it "refuses a malformed token" do
      sign_out(auth_headers("not-a-token"))

      expect(response).to have_http_status(:unauthorized)
    end

    it "refuses a token signed with another key" do
      forged = JWT.encode({ sub: owner.id, exp: 1.hour.from_now.to_i }, "another-key", "HS256")

      sign_out(auth_headers(forged))

      expect(response).to have_http_status(:unauthorized)
    end

    it "refuses an access token past its fifteen minutes" do
      stale = AccessToken.issue(user: owner, at: 16.minutes.ago)

      sign_out(auth_headers(stale))

      expect(response).to have_http_status(:unauthorized)
    end

    it "accepts an access token inside its fifteen minutes" do
      fresh = AccessToken.issue(user: owner, at: 14.minutes.ago)

      sign_out(auth_headers(fresh))

      expect(response).to have_http_status(:no_content)
    end

    it "refuses a token for an account that no longer exists" do
      removed = create(:user)
      token = AccessToken.issue(user: removed)
      removed.destroy

      sign_out(auth_headers(token))

      expect(response).to have_http_status(:unauthorized)
    end

    it "destroys nothing when it refuses" do
      RefreshToken.issue(user: owner)

      expect { sign_out({}) }.not_to change(RefreshToken, :count)
    end
  end
end
