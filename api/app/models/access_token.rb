# The token every request carries. Not a Session and not a Refresh token — see
# Session in shortlist.glossary.md.
#
# shortlist.stack.md: HS256 through the jwt gem, keyed on SECRET_KEY_BASE. One
# service both signs and verifies, so there is no public key and no provider to
# ask whether a token is good.
class AccessToken
  # signing-in.scenarios.md: good for about fifteen minutes. Small on purpose —
  # it is the window in which a signed-out device keeps working.
  LIFETIME = 15.minutes

  ALGORITHM = "HS256"

  class << self
    def issue(user:, at: Time.current)
      JWT.encode(
        { sub: user.id, iat: at.to_i, exp: (at + LIFETIME).to_i },
        secret,
        ALGORITHM
      )
    end

    # Returns the User the token was issued to, or nil for a token that is
    # absent, malformed, signed with another key, or past its expiry. The caller
    # cannot tell those apart, and does not need to.
    def owner(value)
      payload, = JWT.decode(value.to_s, secret, true, algorithm: ALGORITHM)
      User.find_by(id: payload["sub"])
    rescue JWT::DecodeError
      nil
    end

    private
      def secret
        ENV.fetch("SECRET_KEY_BASE")
      end
  end
end
