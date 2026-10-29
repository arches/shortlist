module Api
  # shortlist.principles.md, "Frontend env vars are injected": the frontend
  # bundle carries no configuration, and anything the frontend cannot infer is
  # served by the API, unauthenticated, since the frontend needs it before
  # anybody has signed in.
  #
  # The API's own address is inferred rather than served — a relative /api path
  # is what that inference is — so this endpoint exists for the one value that
  # cannot be: the Google Maps browser key. shortlist.stack.md put Maps on the
  # frontend, and the Maps JS API runs in the browser, so its key has to reach
  # the browser too.
  class ConfigurationController < ApplicationController
    # Deliberately no authenticate_owner!. The sign-in screen is served by the
    # same bundle, so a value the bundle needs has to be readable before there
    # is a session to read it with.

    def show
      render json: { google_maps_api_key: google_maps_api_key }
    end

    private
      # Not the Places key, which shortlist.stack.md keeps server-side: that one
      # is called by the API and never by the browser. Two keys, two exposures,
      # and nothing here can reach the other one.
      def google_maps_api_key
        ENV.fetch("SHORTLIST_GOOGLE_MAPS_API_KEY")
      end
  end
end
