class User < ApplicationRecord
  # shortlist.data.md: the password the owner is handed is at least 8
  # characters, and that is the only rule Shortlist states about one.
  MINIMUM_PASSWORD_LENGTH = 8

  has_secure_password

  normalizes :email, with: ->(email) { email.to_s.strip.downcase }
  normalizes :name, with: ->(name) { name.to_s.strip }

  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :name, presence: true
  validates :password, length: { minimum: MINIMUM_PASSWORD_LENGTH }, allow_nil: true
end
