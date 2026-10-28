module Api
  class ExperiencesController < ApplicationController
    # Reaching an Experience means reaching the Restaurant it happened at
    # first. A restaurant off the list takes its experiences out of reach with
    # it — managing-my-list.scenarios.md, "Taking a restaurant off my list that
    # I have visited" — and this scope is what makes that true without a branch.
    include RestaurantScope

    # managing-experiences.scenarios.md, "Changing an experience that is not
    # mine": reported as not found, and theirs is unchanged. Reaching one means
    # reaching its restaurant first, so another owner's experience is already
    # out of reach before this message can be needed — what it answers is an
    # experience id that belongs to some other restaurant of my own.
    # Named apart from the restaurant refusal in RestaurantScope rather than
    # shadowing it, so which of the two a reader is looking at is never a
    # question about Ruby constant lookup.
    EXPERIENCE_NOT_FOUND = "No such experience is at that restaurant.".freeze

    before_action :authenticate_owner!
    before_action :find_restaurant
    before_action :find_experience, only: [ :update, :destroy ]

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

    # An edit overwrites. There is no history of the history, so a corrected
    # rating leaves no trace of what it used to be.
    #
    # The emptiness rule holds here as well as on a recording: checked only at
    # the moment of recording, it is reachable in two steps by anybody who
    # writes a rating and then deletes it. Nothing extra enforces that — the
    # model validates on both, which is the point of putting it there.
    def update
      if @experience.update(experience_params)
        render json: @experience
      else
        render_invalid(@experience)
      end
    end

    # "And that experience is gone for good." Destroyed rather than retained,
    # which is the opposite of taking a restaurant off the list: a restaurant is
    # kept because nobody tidying their list intends to destroy years of their
    # own notes, whereas this destroys one note outright and the owner is asked
    # to confirm it first. Recovering a removed experience is out of scope in
    # managing-experiences.scenarios.md because there is nothing left to restore.
    #
    # Removing the last experience takes visited away again. Nothing here does
    # that — visited is derived from the count, so it follows from the row going.
    def destroy
      @experience.destroy!

      head :no_content
    end

    private
      # Scoped through the restaurant, so an experience of another restaurant's
      # cannot be reached by naming it here.
      def find_experience
        @experience = @restaurant.experiences.find_by(id: params[:id])

        render_error(EXPERIENCE_NOT_FOUND, status: :not_found) if @experience.nil?
      end

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
