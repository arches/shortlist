# One Restaurant's place on one List, when the owner put it there, and whatever
# the owner wrote down about it. The thing a User adds and removes; the
# Restaurant itself is shared and outlives it.
class ListItem < ApplicationRecord
  belongs_to :list
  belongs_to :restaurant

  # shortlist.data.md, Invariants: a List item's note is trimmed, and one that
  # is empty or nothing but whitespace is stored as absent. So clearing a note
  # is emptying it, and there is no separate act of deleting one — which is why
  # this is a normalization rather than a validation that turns blank away.
  #
  # It belongs to this List item alone. Two owners holding the same Restaurant
  # have independent notes, because the column is here and not on the shared
  # Restaurant row.
  normalizes :note, with: ->(note) { note.to_s.strip.presence }

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
