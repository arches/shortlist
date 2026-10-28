module Api
  class SessionsController < ApplicationController
    # signing-in.scenarios.md: one outcome, three causes, deliberately. Telling
    # them apart would turn the sign-in form into a way to ask whether an address
    # has an account. The refusal for an unknown address and the refusal for a
    # wrong password are the same string, produced by the same path, taking the
    # same time — which is what authenticate_by buys: it compares a password
    # even when no User was found.
    REFUSAL = "The email or password is wrong.".freeze

    before_action :authenticate_owner!, only: :destroy

    def create
      user = User.authenticate_by(email: credentials[:email], password: credentials[:password])
      return render_error(REFUSAL, status: :unauthorized) if user.nil?

      render json: issued_session(user), status: :created
    end

    # signing-in.scenarios.md: signing out destroys every refresh token the
    # owner has, so no device can renew again. It is not instant on other
    # devices — one already holding an unexpired access token keeps working
    # until it expires, and fifteen minutes is the worst case.
    def destroy
      current_owner.refresh_tokens.destroy_all

      head :no_content
    end

    private
      def credentials
        {
          email: params[:email].to_s,
          password: params[:password].to_s
        }
      end

      def issued_session(user)
        {
          access_token: AccessToken.issue(user: user),
          refresh_token: RefreshToken.issue(user: user).token,
          expires_in: AccessToken::LIFETIME.to_i
        }
      end
  end
end
