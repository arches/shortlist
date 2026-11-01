# What signing in, renewing and signing up all hand back: the pair of tokens a
# Session is continued with, and how long the short-lived half lasts.
#
# shortlist.glossary.md: a Session is not an entity, so there is no row behind
# this and nothing to serialize. It is the one shape three controllers answer
# with, which is the whole reason it is in one place.
module IssuesSessions
  extend ActiveSupport::Concern

  private
    # signing-in.scenarios.md: signing in returns two things — a short-lived
    # access token, good for about fifteen minutes, which every request carries,
    # and a longer-lived refresh token, good for thirty days, which buys a fresh
    # pair of both.
    def issued_session(user)
      {
        access_token: AccessToken.issue(user: user),
        refresh_token: RefreshToken.issue(user: user).token,
        expires_in: AccessToken::LIFETIME.to_i
      }
    end
end
