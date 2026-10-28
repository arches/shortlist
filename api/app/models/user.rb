class User < ApplicationRecord
  # shortlist.data.md: the password the owner is handed is at least 8
  # characters, and that is the only rule Shortlist states about one.
  MINIMUM_PASSWORD_LENGTH = 8

  has_secure_password

  # shortlist.data.md, Ownership: a User owns their Refresh tokens, and deleting
  # a User cascades to them.
  has_many :refresh_tokens, dependent: :destroy

  # A User owns their Restaurants. Deleting a User cascades to them, destroying
  # every restaurant they ever recorded. Nothing in the application does that.
  has_many :restaurants, dependent: :destroy

  # A User owns their Experiences too, so deleting one destroys every note they
  # ever recorded.
  has_many :experiences, dependent: :destroy

  normalizes :email, with: ->(email) { email.to_s.strip.downcase }
  normalizes :name, with: ->(name) { name.to_s.strip }

  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :name, presence: true
  validates :password, length: { minimum: MINIMUM_PASSWORD_LENGTH }, allow_nil: true
end
