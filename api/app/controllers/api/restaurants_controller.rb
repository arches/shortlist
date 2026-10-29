module Api
  class RestaurantsController < ApplicationController
    # The scope a restaurant is reachable through, and the one refusal for
    # everything outside it. Shared with ExperiencesController, because the two
    # artifacts require the same string produced by the same path.
    include RestaurantScope

    UNAVAILABLE = "Restaurant details are unavailable just now.".freeze
    NEEDS_A_PLACE = "Pick a restaurant from the suggestions.".freeze

    before_action :authenticate_owner!
    before_action :find_restaurant, only: [ :destroy ]

    # The List is the set of Restaurants my List items point at. There is
    # exactly one List per owner, so nothing identifies it in the URL.
    def index
      render json: on_the_list.order(:name).as_json(owner: current_owner)
    end

    # managing-my-list.scenarios.md: the owner types, picks a Google Places
    # result, and what Shortlist receives is its Place ID. Every other detail is
    # Google's, so nothing else is settable on the way in.
    def create
      google_place_id = create_params[:google_place_id].to_s
      return render_error(NEEDS_A_PLACE, status: :unprocessable_content) if google_place_id.empty?

      restaurant = restaurant_for(google_place_id)
      return render_invalid(restaurant) unless restaurant.persisted?

      add_to_my_list(restaurant)
    rescue ::Places::Error
      render_error(UNAVAILABLE, status: :bad_gateway)
    end

    # Taking a restaurant off the list destroys that List item and nothing else.
    # The Restaurant stands — it is shared, and somebody else may have it on
    # their list — and so do my Experiences at it, which go out of reach until
    # it goes back on.
    def destroy
      my_list.list_items.find_by!(restaurant: @restaurant).destroy!

      head :no_content
    end

    private
      # "And no new restaurant was created in the system": there is one row per
      # Place for the whole system, so a Place already here is reused rather
      # than copied. Only a Place new to Shortlist costs a Place Details call,
      # which is the one ADR 0001 says we eventually pay for.
      def restaurant_for(google_place_id)
        Restaurant.find_by(google_place_id: google_place_id) ||
          Restaurant.create(::Places::Client.new.details(google_place_id).to_restaurant_attributes)
      end

      # A List holds a given Restaurant at most once, so a second add is the
      # rejection rather than a second List item.
      def add_to_my_list(restaurant)
        item = my_list.list_items.new(restaurant: restaurant)

        if item.save
          render json: restaurant.as_json(owner: current_owner), status: :created
        else
          render_invalid(item)
        end
      end

      # The Place ID and nothing else. Everything the owner sees about a
      # Restaurant is cached from Google, so there is nothing else to send.
      def create_params
        params.expect(restaurant: [ :google_place_id ])
      end
  end
end
