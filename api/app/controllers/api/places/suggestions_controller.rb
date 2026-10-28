module Api
  module Places
    # managing-my-list.scenarios.md: "When I type ... Then I see autocomplete
    # suggestions from the Google Places API". The browser asks Shortlist and
    # Shortlist asks Google, because the key is server-side configuration —
    # shortlist.stack.md and the sequence diagram both say so.
    class SuggestionsController < ApplicationController
      # Typing is part of adding, and adding while signed out is refused.
      # Autocomplete is also the expensive call ADR 0001 warns about, so there
      # is no version of this that answers an unauthenticated request.
      before_action :authenticate_owner!

      UNAVAILABLE = "Restaurant suggestions are unavailable just now.".freeze

      def index
        render json: client.suggestions(params[:q]).map { |suggestion|
          { google_place_id: suggestion.google_place_id, description: suggestion.description }
        }
      rescue ::Places::Error
        render_error(UNAVAILABLE, status: :bad_gateway)
      end

      private
        def client
          ::Places::Client.new
        end
    end
  end
end
