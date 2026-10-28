require "rails_helper"

# Derived from shortlist.data.md: the Refresh token attribute table, its identity
# rule, its invariant, the derived `expired`, and the Ownership section. The
# thirty-day lifetime comes from signing-in.scenarios.md.
RSpec.describe RefreshToken do
  it "is valid with a user, a token and a window" do
    expect(build(:refresh_token)).to be_valid
  end

  describe "required attributes" do
    it "rejects a Refresh token with no user" do
      token = build(:refresh_token, user: nil)

      expect(token).not_to be_valid
      expect(token.errors[:user]).to be_present
    end

    it "rejects a Refresh token with no token value" do
      token = build(:refresh_token, token: nil)

      expect(token).not_to be_valid
      expect(token.errors[:token]).to be_present
    end

    it "rejects a Refresh token with no issued_at" do
      token = build(:refresh_token, issued_at: nil)

      expect(token).not_to be_valid
      expect(token.errors[:issued_at]).to be_present
    end

    it "rejects a Refresh token with no expires_at" do
      token = build(:refresh_token, expires_at: nil)

      expect(token).not_to be_valid
      expect(token.errors[:expires_at]).to be_present
    end
  end

  # shortlist.data.md, Identity: the token value, globally unique.
  it "rejects a second Refresh token with the same token value" do
    create(:refresh_token, token: "the-same-value")
    duplicate = build(:refresh_token, token: "the-same-value")

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:token]).to be_present
  end

  # shortlist.data.md, Invariants: expires_at is later than issued_at. A token
  # that is expired the moment it is minted is a bug, not a revocation.
  it "rejects a Refresh token that expires when it was issued" do
    issued = Time.current
    token = build(:refresh_token, issued_at: issued, expires_at: issued)

    expect(token).not_to be_valid
    expect(token.errors[:expires_at]).to be_present
  end

  it "rejects a Refresh token that expires before it was issued" do
    issued = Time.current
    token = build(:refresh_token, issued_at: issued, expires_at: issued - 1.second)

    expect(token).not_to be_valid
    expect(token.errors[:expires_at]).to be_present
  end

  describe ".issue" do
    it "expires thirty days after it was issued" do
      issued = Time.current
      token = RefreshToken.issue(user: create(:user), at: issued)

      expect(token.issued_at).to be_within(1.second).of(issued)
      expect(token.expires_at).to be_within(1.second).of(issued + 30.days)
    end

    it "mints a value that is unguessable and never repeated" do
      user = create(:user)

      values = Array.new(3) { RefreshToken.issue(user: user).token }

      expect(values.uniq.length).to eq(3)
      expect(values).to all(have_attributes(length: be >= 32))
    end
  end

  # shortlist.data.md, Derived: expired is the comparison made when the token is
  # presented, not a column.
  describe "#expired?" do
    it "is false inside the thirty days" do
      token = RefreshToken.issue(user: create(:user))

      expect(token.expired?(at: 29.days.from_now)).to be(false)
    end

    it "is true once the thirty days have passed" do
      token = RefreshToken.issue(user: create(:user))

      expect(token.expired?(at: 31.days.from_now)).to be(true)
    end
  end

  # shortlist.data.md, Ownership: deleting a User cascades to their Refresh tokens.
  it "is destroyed with its User" do
    user = create(:user)
    RefreshToken.issue(user: user)

    expect { user.destroy }.to change(RefreshToken, :count).by(-1)
  end
end
