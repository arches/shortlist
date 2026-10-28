module Api
  class SessionsController < ApplicationController
    # signing-in.scenarios.md: one outcome, three causes, deliberately. Telling
    # them apart would turn the sign-in form into a way to ask whether an address
    # has an account. The refusal for an unknown address and the refusal for a
    # wrong password are the same string, produced by the same path, taking the
    # same time — which is what authenticate_by buys: it compares a password
    # even when no User was found.
    REFUSAL = "The email or password is wrong.".freeze

    def create
      user = User.authenticate_by(email: credentials[:email], password: credentials[:password])
      return render_error(REFUSAL, status: :unauthorized) if user.nil?

      render json: issued_session(user), status: :created
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
