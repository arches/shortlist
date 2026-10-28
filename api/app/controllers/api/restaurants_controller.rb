module Api
  class RestaurantsController < ApplicationController
    # managing-my-list.scenarios.md: a restaurant belonging to someone else is
    # reported the same way as one that does not exist. Saying "not allowed"
    # instead would confirm that another owner's restaurant exists, which is the
    # same reasoning behind the deliberately generic sign-in failure.
    NOT_FOUND = "No such restaurant is on your list.".freeze

    before_action :authenticate_owner!
    before_action :find_restaurant, only: [ :update ]

    # managing-my-list.scenarios.md: the List is the set of one owner's
    # non-removed Restaurants — informal, not an entity, and there is exactly
    # one per owner, so nothing identifies it in the URL.
    def index
      render json: on_the_list.order(:name)
    end

    # A restaurant needs a name and nothing else, because the usual way a
    # restaurant arrives is as a name somebody mentioned.
    def create
      restaurant = current_owner.restaurants.new(restaurant_params)

      if restaurant.save
        render json: restaurant, status: :created
      else
        render_invalid(restaurant)
      end
    end

    # Changing one detail leaves the others alone: this is what rules out having
    # to restate a whole restaurant to correct one field of it. Clearing a detail
    # is a distinct act from leaving it alone, and sending null is how it is said.
    def update
      if @restaurant.update(restaurant_params)
        render json: @restaurant
      else
        render_invalid(@restaurant)
      end
    end

    private
      # A restaurant that belongs to another owner, is already off the list, or
      # was never there at all is reported identically. The scope is what makes
      # that true — there is no branch that could leak the difference.
      def find_restaurant
        @restaurant = on_the_list.find_by(id: params[:id])

        render_error(NOT_FOUND, status: :not_found) if @restaurant.nil?
      end

      # The full attribute table from shortlist.data.md, less the four the owner
      # does not set: id, user, the timestamps, and removed_at. The one-line
      # address in the scenario is shorthand — the fields are separate here, and
      # nothing parses one into the other.
      def restaurant_params
        params.expect(
          restaurant: [
            :name,
            :url, :google_maps_url, :yelp_url,
            :address_line_1, :address_line_2, :city, :state, :postal_code, :country,
            :cuisine, :specialty, :notes
          ]
        )
      end

      def on_the_list
        current_owner.restaurants.on_the_list
      end
  end
end
