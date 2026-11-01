class User < ApplicationRecord
  # signing-in.scenarios.md, "Details Shortlist will not accept": a password
  # shorter than twelve characters is refused, and that outline is the only rule
  # any artifact states about one. Nothing checks it against a breach list,
  # requires a mix of character classes, expires it, or remembers previous ones.
  #
  # A rule on a User rather than on signing up, so an account created by hand
  # obeys it too. See ASSUMPTIONS.md, "How long a password has to be".
  MINIMUM_PASSWORD_LENGTH = 12

  has_secure_password

  # shortlist.data.md, Ownership: a User owns their Refresh tokens, and deleting
  # a User cascades to them.
  has_many :refresh_tokens, dependent: :destroy

  # shortlist.data.md, Ownership: deleting a User deletes their lists, and their
  # list items with them. The Restaurants those items point at are shared and
  # stand, which is why nothing here is a dependent association to them.
  has_many :lists, dependent: :destroy
  has_many :restaurants, through: :lists

  # A User owns their Experiences too, so deleting one destroys every note they
  # ever recorded.
  has_many :experiences, dependent: :destroy

  normalizes :email, with: ->(email) { email.to_s.strip.downcase }
  normalizes :name, with: ->(name) { name.to_s.strip }

  # signing-in.scenarios.md, "Signing up with an address that already has an
  # account": the owner is told that address already has one. This is the one
  # place Shortlist discloses whether an address is on file — signing in
  # refuses to, and the scenario set gives that up here deliberately, because
  # an owner typing an address they already hold needs sending to the sign-in
  # form rather than leaving to guess.
  validates :email,
    presence: true,
    uniqueness: { message: "already has an account" },
    format: { with: URI::MailTo::EMAIL_REGEXP }
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
