module Api
  class RestaurantsController < ApplicationController
    before_action :authenticate_owner!

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

      def on_the_list
        current_owner.restaurants.on_the_list
      end
  end
end
