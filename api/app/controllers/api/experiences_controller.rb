module Api
  class ExperiencesController < ApplicationController
    # Reaching an Experience means reaching the Restaurant it happened at
    # first. A restaurant off the list takes its experiences out of reach with
    # it — managing-my-list.scenarios.md, "Taking a restaurant off my list that
    # I have visited" — and this scope is what makes that true without a branch.
    include RestaurantScope

    before_action :authenticate_owner!
    before_action :find_restaurant

    # Most recent first by the day it happened, undated ones last. The order is
    # settled here rather than in the browser, so every reader of this list sees
    # the one order managing-experiences.scenarios.md specifies.
    def index
      render json: @restaurant.experiences.most_recent_first
    end
  end
end
