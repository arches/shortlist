module Api
  # signing-in.scenarios.md: a session is renewed rather than held open. A
  # refresh token buys a fresh pair of both, and is then spent — the presented
  # row is destroyed and a new one issued in its place, so a refresh token is
  # good for exactly one use.
  #
  # This is not an authenticated endpoint in the access-token sense. The refresh
  # token is the credential, which is the whole point: it is reached when the
  # access token has already run out.
  class SessionRenewalsController < ApplicationController
    REFUSAL = "That session cannot be renewed.".freeze

    def create
      presented = RefreshToken.find_by(token: params[:refresh_token].to_s)
      return render_error(REFUSAL, status: :unauthorized) if presented.nil?

      owner = presented.user

      # Thirty days is a ceiling on a session, not an idle timer. An expired row
      # is spent either way, so that it cannot be presented a second time.
      expired = presented.expired?
      presented.destroy!
      return render_error(REFUSAL, status: :unauthorized) if expired

      render json: renewed_session(owner), status: :created
    end

    private
      def renewed_session(owner)
        {
          access_token: AccessToken.issue(user: owner),
          refresh_token: RefreshToken.issue(user: owner).token,
          expires_in: AccessToken::LIFETIME.to_i
        }
      end
  end
end
