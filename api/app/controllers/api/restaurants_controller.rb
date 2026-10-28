module Api
  class RestaurantsController < ApplicationController
    before_action :authenticate_owner!

    # managing-my-list.scenarios.md: the List is the set of one owner's
    # non-removed Restaurants — informal, not an entity, and there is exactly
    # one per owner, so nothing identifies it in the URL.
    def index
      render json: on_the_list.order(:name)
    end

    private
      def on_the_list
        current_owner.restaurants.on_the_list
      end
  end
end
