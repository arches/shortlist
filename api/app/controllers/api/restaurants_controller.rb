module Api
  class RestaurantsController < ApplicationController
    # The scope a restaurant is reachable through, and the one refusal for
    # everything outside it. Shared with ExperiencesController, because the two
    # artifacts require the same string produced by the same path.
    include RestaurantScope

    before_action :authenticate_owner!
    before_action :find_restaurant, only: [ :update, :destroy ]

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

    # Taking a restaurant off the list is a tidying action, and nobody doing it
    # intends to destroy years of their own notes. So the row survives and its
    # Experiences survive with it — Removed buys retention, not recovery, and
    # nothing reads them back.
    def destroy
      @restaurant.update!(removed_at: Time.current)

      head :no_content
    end

    private
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
  end
end
