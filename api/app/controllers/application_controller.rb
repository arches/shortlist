class ApplicationController < ActionController::API
  private
    # One shape for every refusal that carries a single message.
    def render_error(message, status:)
      render json: { error: message }, status: status
    end

    # One shape for a refusal that has something to say per attribute.
    def render_invalid(record)
      render json: { errors: record.errors.to_hash(true) }, status: :unprocessable_content
    end
end
