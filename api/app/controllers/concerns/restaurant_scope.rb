# One owner's reachable restaurants, and the one refusal for everything else.
#
# managing-my-list.scenarios.md and managing-experiences.scenarios.md both
# report a restaurant belonging to another owner, one already off the list, and
# one that was never there at all identically. Saying "not allowed" instead
# would confirm that another owner's restaurant exists, which is the same
# reasoning behind the deliberately generic sign-in failure.
#
# Sharing the scope and the string is what keeps that true of both: there is no
# branch that could leak the difference, and no second wording to drift.
module RestaurantScope
  extend ActiveSupport::Concern

  NOT_FOUND = "No such restaurant is on your list.".freeze

  private
    # shortlist.data.md, Derived: the List is the set of one owner's non-removed
    # Restaurants — informal, not an entity, and there is exactly one per owner.
    def on_the_list
      current_owner.restaurants.on_the_list
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
