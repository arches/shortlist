require "rails_helper"

# Derived from signing-in.scenarios.md: "Signing up", "Signing up with an
# address that already has an account", and the Scenario Outline "Details
# Shortlist will not accept" with all three of its rows.
RSpec.describe "POST /api/users" do
  def sign_up(name:, email:, password:)
    post "/api/users", params: { name: name, email: email, password: password }, as: :json
  end

  def sign_up_nora
    sign_up(
      name: "Nora Vance",
      email: "nora.vance@fastmail.com",
      password: "quiet-lemon-garden-fence"
    )
  end

  # Scenario: Signing up
  describe "with details Shortlist accepts" do
    # Given no account exists for "nora.vance@fastmail.com"
    it "creates the account" do
      expect { sign_up_nora }.to change(User, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(User.sole).to have_attributes(name: "Nora Vance", email: "nora.vance@fastmail.com")
    end

    # "And I am not asked to sign in" — the pair comes back with the account,
    # so there is no second request standing between signing up and the list.
    it "opens a session without asking for one" do
      sign_up_nora

      expect(response.parsed_body["refresh_token"]).to be_present
      expect(AccessToken.owner(response.parsed_body["access_token"])).to eq(User.sole)
    end

    it "says how long the access token lasts, as signing in does" do
      sign_up_nora

      expect(response.parsed_body["expires_in"]).to eq(15.minutes.to_i)
    end

    it "records a refresh token for the new owner, good for thirty days" do
      sign_up_nora

      issued = User.sole.refresh_tokens.sole
      expect(response.parsed_body["refresh_token"]).to eq(issued.token)
      expect(issued.expires_at).to be_within(1.minute).of(30.days.from_now)
    end

    # "Then my list opens. And it is called "My List". And nothing is on it."
    it "gives the new owner a list called \"My List\" with nothing on it" do
      sign_up_nora

      list = User.sole.lists.sole
      expect(list.name).to eq("My List")
      expect(list.list_items).to be_empty
    end

    it "stores a digest the new owner can sign in against, and never the password" do
      sign_up_nora

      owner = User.sole
      expect(owner.password_digest).not_to include("quiet-lemon-garden-fence")
      expect(owner.authenticate("quiet-lemon-garden-fence")).to eq(owner)
    end

    it "accepts the address however it was typed" do
      sign_up(
        name: "Nora Vance",
        email: "  NORA.VANCE@Fastmail.com ",
        password: "quiet-lemon-garden-fence"
      )

      expect(User.sole.email).to eq("nora.vance@fastmail.com")
    end
  end

  # Scenario: Signing up with an address that already has an account
  describe "with an address that already has an account" do
    let(:password) { "correct-horse-battery-staple" }
    let!(:sam) { create(:user, email: "sam.reed@fastmail.com", name: "Sam Reed", password: password) }

    def collide
      sign_up(
        name: "Sam Reed",
        email: "sam.reed@fastmail.com",
        password: "quiet-lemon-garden-fence"
      )
    end

    # render_invalid sends full messages, which is the shape every other
    # refusal in the API already has.
    it "refuses, and says that address already has an account" do
      collide

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"]["email"]).to eq([ "Email already has an account" ])
    end

    it "creates no second account at that address" do
      expect { collide }.not_to change(User, :count)
    end

    # "And the password on that account still works." A sign-up that reset the
    # password of the account it collided with would be a way to take
    # somebody's list from them knowing only their address.
    it "leaves the password on the account it collided with working" do
      collide

      expect(sam.reload.authenticate(password)).to eq(sam)
      expect(sam.authenticate("quiet-lemon-garden-fence")).to be(false)
    end

    it "leaves the name on that account alone" do
      sign_up(name: "Somebody Else", email: "sam.reed@fastmail.com", password: "quiet-lemon-garden")

      expect(sam.reload.name).to eq("Sam Reed")
    end

    it "opens no session" do
      expect { collide }.not_to change(RefreshToken, :count)

      expect(response.parsed_body).not_to include("access_token")
      expect(response.parsed_body).not_to include("refresh_token")
    end

    # The address differs only in case and whitespace, which shortlist.data.md's
    # identity rule makes the same address.
    it "refuses an address that differs only in case and whitespace" do
      sign_up(name: "Sam Reed", email: " SAM.REED@FASTMAIL.COM ", password: "quiet-lemon-garden")

      expect(response).to have_http_status(:unprocessable_content)
      expect(User.count).to eq(1)
    end
  end

  # Scenario Outline: Details Shortlist will not accept
  describe "with details Shortlist will not accept" do
    refusals = [
      [ "shorter than twelve characters", "Nora Vance", "nora.vance@fastmail.com", "lemon", "password" ],
      [ "not an email address", "Nora Vance", "nora.vance", "quiet-lemon-garden-fence", "email" ],
      [ "no name given", "", "nora.vance@fastmail.com", "quiet-lemon-garden-fence", "name" ]
    ]

    refusals.each do |why, name, email, password, attribute|
      describe why do
        before { sign_up(name: name, email: email, password: password) }

        # "Then I am told what to fix"
        it "says what to fix" do
          expect(response).to have_http_status(:unprocessable_content)
          expect(response.parsed_body["errors"][attribute]).to be_present
        end

        # "And no account is created"
        it "creates no account" do
          expect(User.count).to eq(0)
        end

        # "And I am not signed in"
        it "opens no session" do
          expect(RefreshToken.count).to eq(0)
          expect(response.parsed_body).not_to include("access_token")
        end
      end
    end
  end

  describe "with nothing at all" do
    it "says what to fix rather than failing" do
      post "/api/users", params: {}, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"].keys).to include("email", "name", "password")
      expect(User.count).to eq(0)
    end
  end
end
