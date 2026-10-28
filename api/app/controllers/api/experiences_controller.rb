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

    # An experience needs one of a rating, a note or a date, and nothing else.
    # All three are optional individually because the three reasons to write one
    # down are different — a score, something worth remembering, and when it
    # happened — and an owner rarely has all three to hand.
    #
    # The owner comes from the scope rather than from the request. An
    # Experience's owner is the same User as its Restaurant's owner, and
    # @restaurant was found through this owner's own list, so there is no way to
    # record one against somebody else.
    def create
      experience = @restaurant.experiences.new(experience_params)
      experience.user = current_owner

      if experience.save
        render json: experience, status: :created
      else
        render_invalid(experience)
      end
    end

    private
      # The three the owner sets. restaurant comes from the path, user from the
      # scope, recorded_at from the model, and nothing sets updated_at.
      #
      # fetch rather than expect: all three are optional on their own, so an
      # experience with nothing in it has to reach the model to be turned away.
      # "It is rejected as empty" names that invariant, not a missing parameter.
      def experience_params
        params.fetch(:experience, {}).permit(:rating, :notes, :occurred_on)
      end
  end
end
