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

  # shortlist.data.md, Ownership: deleting a User deletes their lists, and their
  # list items with them.
  has_many :lists, dependent: :destroy

  # A User owns their Experiences too, so deleting one destroys every note they
  # ever recorded.
  has_many :experiences, dependent: :destroy

  normalizes :email, with: ->(email) { email.to_s.strip.downcase }
  normalizes :name, with: ->(name) { name.to_s.strip }

  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :name, presence: true
  validates :password, length: { minimum: MINIMUM_PASSWORD_LENGTH }, allow_nil: true

  # shortlist.data.md, Invariants: the default list is called "My List" and is
  # created when the user is created. There is no moment at which a User exists
  # without one, so nothing downstream has to cope with an owner who has no List.
  after_create :create_default_list

  private
    def create_default_list
      lists.create!(name: List::DEFAULT_NAME)
    end
end
