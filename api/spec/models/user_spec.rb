require "rails_helper"

# Derived from shortlist.data.md: the User attribute table, the identity rule,
# and the two invariants that name a User.
RSpec.describe User do
  it "is valid with a name, an email and a password" do
    expect(build(:user)).to be_valid
  end

  describe "required attributes" do
    it "rejects a User with no email" do
      user = build(:user, email: nil)

      expect(user).not_to be_valid
      expect(user.errors[:email]).to be_present
    end

    it "rejects a User with no name" do
      user = build(:user, name: nil)

      expect(user).not_to be_valid
      expect(user.errors[:name]).to be_present
    end

    it "rejects a User with a name that is only whitespace" do
      user = build(:user, name: "   ")

      expect(user).not_to be_valid
      expect(user.errors[:name]).to be_present
    end

    # shortlist.data.md, Invariants: a User always has a password_digest. There
    # is no credential-less account.
    it "rejects a User with no password" do
      user = build(:user, password: nil)

      expect(user).not_to be_valid
      expect(user.password_digest).to be_nil
    end
  end

  describe "email" do
    it "rejects a value that is not an email address" do
      user = build(:user, email: "not-an-address")

      expect(user).not_to be_valid
      expect(user.errors[:email]).to be_present
    end

    it "stores the address lowercased and trimmed" do
      user = create(:user, email: "  Sam.Reed@Fastmail.COM ")

      expect(user.reload.email).to eq("sam.reed@fastmail.com")
    end

    # shortlist.data.md, Identity: one account per address.
    it "rejects a second User at the same address" do
      create(:user, email: "sam.reed@fastmail.com")
      duplicate = build(:user, email: "sam.reed@fastmail.com")

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:email]).to be_present
    end

    it "rejects a second User whose address differs only in case and whitespace" do
      create(:user, email: "sam.reed@fastmail.com")
      duplicate = build(:user, email: " SAM.REED@FASTMAIL.COM ")

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:email]).to be_present
    end
  end

  describe "password" do
    it "rejects a password shorter than eight characters" do
      user = build(:user, password: "hunter2")

      expect(user).not_to be_valid
      expect(user.errors[:password]).to be_present
    end

    it "accepts a password of exactly eight characters" do
      expect(build(:user, password: "12345678")).to be_valid
    end

    # shortlist.data.md: the hash of the password. Never the password.
    it "stores a digest and never the password itself" do
      user = create(:user, password: "correct-horse-battery-staple")

      expect(user.password_digest).to be_present
      expect(user.password_digest).not_to include("correct-horse-battery-staple")
      expect(user.reload.attributes).not_to include("password")
    end

    it "authenticates against the digest" do
      user = create(:user, password: "correct-horse-battery-staple")

      expect(user.authenticate("correct-horse-battery-staple")).to eq(user)
      expect(user.authenticate("hunter2")).to be(false)
    end
  end
end
