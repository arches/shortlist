class ApplicationController < ActionController::API
  # signing-in.scenarios.md: every request carries a short-lived access token.
  # Shortlist verifies it itself — there is no provider to ask whether a token
  # is good.
  #
  # A refusal here is the ordinary consequence of an access token running out,
  # and the frontend's first response to one is to renew rather than to give up.
  # Only a refused renewal means the session has actually ended.
  UNAUTHENTICATED = "Sign in to continue.".freeze

  private
    def authenticate_owner!
      @current_owner = AccessToken.owner(presented_access_token)

      render_error(UNAUTHENTICATED, status: :unauthorized) if @current_owner.nil?
    end

    attr_reader :current_owner

    # An absent token, a malformed one, one signed with another key and one past
    # its expiry are all refused the same way, because nothing downstream has a
    # different thing to do about them.
    def presented_access_token
      request.authorization.to_s[/\ABearer (.+)\z/, 1]
    end

    # One shape for every refusal that carries a single message.
    def render_error(message, status:)
      render json: { error: message }, status: status
    end

    # One shape for a refusal that has something to say per attribute.
    def render_invalid(record)
      render json: { errors: record.errors.to_hash(true) }, status: :unprocessable_content
    end
end
