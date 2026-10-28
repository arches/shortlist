# One device's standing permission to keep renewing a Session without signing in
# again. Not the token the API authenticates requests with — see Session in
# shortlist.glossary.md.
class RefreshToken < ApplicationRecord
  # signing-in.scenarios.md: a refresh token is good for thirty days.
  LIFETIME = 30.days

  # Long enough not to collide, per shortlist.data.md's identity rule.
  TOKEN_BYTES = 32

  belongs_to :user

  validates :token, presence: true, uniqueness: true
  validates :issued_at, presence: true
  validates :expires_at, presence: true
  validate :expires_after_it_was_issued

  # shortlist.data.md, Derived: expired is not a column. The comparison is made
  # when the token is presented, so nothing has to sweep the table.
  def expired?(at: Time.current)
    expires_at <= at
  end

  # A row is created at sign-in and replaced at every renewal, so a refresh
  # token is good for exactly one use.
  def self.issue(user:, at: Time.current)
    create!(
      user: user,
      token: SecureRandom.urlsafe_base64(TOKEN_BYTES),
      issued_at: at,
      expires_at: at + LIFETIME
    )
  end

  private
    def expires_after_it_was_issued
      return if expires_at.blank? || issued_at.blank?
      return if expires_at > issued_at

      errors.add(:expires_at, "must be later than issued_at")
    end
end
