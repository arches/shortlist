# One owner's reachable restaurants, and the one refusal for everything else.
#
# managing-my-list.scenarios.md and managing-experiences.scenarios.md both
# report a restaurant that is off the list and one that was never on it
# identically. A Restaurant is shared now, so "belongs to another user" is not a
# case that exists: what it used to mean is a Place on somebody else's list and
# not on mine, which is the same refusal by the same path.
#
# Sharing the scope and the string is what keeps that true of both: there is no
# branch that could leak the difference, and no second wording to drift.
module RestaurantScope
  extend ActiveSupport::Concern

  NOT_FOUND = "No such restaurant is on your list.".freeze

  private
    # Every owner has exactly one List, the default "My List" created with the
    # User — see ASSUMPTIONS.md, "Which List a request works against". sole is
    # deliberate: a second one would be a bug worth hearing about.
    def my_list
      current_owner.lists.sole
    end

    # The List is what an owner reaches restaurants through. A Restaurant with
    # no List item of mine is not mine to see, whoever else holds it.
    def on_the_list
      my_list.restaurants
    end

    # Nested under a restaurant the id arrives as :restaurant_id; on the
    # restaurant itself it is :id. Both name the same row, so both take the same
    # lookup and the same refusal. Where a nested request carries an :id of its
    # own it belongs to the Experience, never to the Restaurant.
    def find_restaurant
      @restaurant = on_the_list.find_by(id: params[:restaurant_id] || params[:id])

      render_error(NOT_FOUND, status: :not_found) if @restaurant.nil?
    end
end
