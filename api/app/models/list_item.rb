# One Restaurant's place on one List, and when the owner put it there. The thing
# a User adds and removes; the Restaurant itself is shared and outlives it.
class ListItem < ApplicationRecord
  belongs_to :list
  belongs_to :restaurant

  before_validation :set_added_at, on: :create

  validates :added_at, presence: true

  # shortlist.data.md, Invariants: a List holds a given Restaurant at most once.
  # A second add is the rejection in managing-my-list.scenarios.md, not a second
  # List item.
  validates :restaurant_id,
    uniqueness: { scope: :list_id, message: "is already on your list" }

  private
    def set_added_at
      self.added_at ||= Time.current
    end
end
