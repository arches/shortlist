module Api
  class RestaurantsController < ApplicationController
    # The scope a restaurant is reachable through, and the one refusal for
    # everything outside it. Shared with ExperiencesController, because the two
    # artifacts require the same string produced by the same path.
    include RestaurantScope

    UNAVAILABLE = "Restaurant details are unavailable just now.".freeze
    NEEDS_A_PLACE = "Pick a restaurant from the suggestions.".freeze

    before_action :authenticate_owner!
    before_action :find_restaurant, only: [ :update, :destroy ]

    # The List is the set of Restaurants my List items point at. There is
    # exactly one List per owner, so nothing identifies it in the URL.
    def index
      render json: on_the_list.order(:name).as_json(owner: current_owner)
    end

    # managing-my-list.scenarios.md: the owner types, picks a Google Places
    # result, and what Shortlist receives is its Place ID — plus the note they
    # wrote, which is theirs rather than Google's. Every other detail is
    # Google's, so nothing else is settable on the way in.
    def create
      google_place_id = create_params[:google_place_id].to_s
      return render_error(NEEDS_A_PLACE, status: :unprocessable_content) if google_place_id.empty?

      restaurant = restaurant_for(google_place_id)
      return render_invalid(restaurant) unless restaurant.persisted?

      add_to_my_list(restaurant, create_params[:note])
    rescue ::Places::Error
      render_error(UNAVAILABLE, status: :bad_gateway)
    end

    # managing-my-list.scenarios.md, "Changing the note on a restaurant on my
    # list": the owner sets the note to something, to something else, or to
    # nothing, and the restaurant stays on the list with the day it went on it
    # unchanged. An edit overwrites, and no earlier version is kept anywhere.
    #
    # What this changes is my List item, not the Restaurant — which is why
    # there is nothing here an owner could change about a Place that somebody
    # else also holds. The route shape is an assumption; see ASSUMPTIONS.md,
    # "How the note on a restaurant already on my list is changed".
    def update
      item = my_list.list_items.find_by!(restaurant: @restaurant)

      if item.update(update_params)
        render json: @restaurant.as_json(owner: current_owner)
      else
        render_invalid(item)
      end
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
      # rejection rather than a second List item — and the note carried by the
      # rejected add is discarded rather than written over the standing one.
      # Nothing here has to discard it: the note arrives on a List item that is
      # never saved, and the standing one is a different row that is never
      # loaded.
      def add_to_my_list(restaurant, note)
        item = my_list.list_items.new(restaurant: restaurant, note: note)

        if item.save
          render json: restaurant.as_json(owner: current_owner), status: :created
        else
          render_invalid(item)
        end
      end

      # The Place ID and the note. Everything else the owner sees about a
      # Restaurant is cached from Google, so there is nothing else to send.
      #
      # The note is optional and a blank one means no note, which the model's
      # normalization is what settles — so a note of nothing but whitespace
      # arrives here as typed and is stored as absent.
      def create_params
        params.expect(restaurant: [ :google_place_id, :note ])
      end

      # The note and nothing else. A Place ID is identity — ADR 0001 — so
      # changing one would be a different restaurant rather than a changed one,
      # and everything beside it is Google's.
      #
      # fetch rather than expect, because clearing the note is emptying it: the
      # owner who sends an empty note is saying something the scenario names,
      # and a required parameter would turn it away.
      def update_params
        params.fetch(:restaurant, {}).permit(:note)
      end
  end
end
