# One occasion of eating at a Restaurant, carrying what the owner thought of it.
# Not a visit, a review, a check-in or an occasion — see shortlist.glossary.md.
class Experience < ApplicationRecord
  # shortlist.data.md, Enumerations: nine values, no zero, and can be empty.
  RATINGS = [ 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5 ].map { |value| BigDecimal(value.to_s) }.freeze

  belongs_to :restaurant
  belongs_to :user

  before_validation :set_recorded_at, on: :create

  validates :recorded_at, presence: true
  validates :rating, inclusion: { in: RATINGS }, allow_nil: true

  validate :says_something
  validate :owner_matches_the_restaurants_owner
  validate :occurred_on_or_before_the_day_it_was_recorded

  private
    def set_recorded_at
      self.recorded_at ||= Time.current
    end

    # shortlist.data.md, Invariants: an Experience carries at least one of
    # rating, notes or occurred_on. All three absent is not an Experience.
    def says_something
      return if rating.present? || notes.present? || occurred_on.present?

      errors.add(:base, "needs a rating, a note or a date")
    end

    # An Experience's owner is the same User as its Restaurant's owner.
    def owner_matches_the_restaurants_owner
      return if restaurant.nil? || user_id.nil?
      return if restaurant.user_id == user_id

      errors.add(:user, "must be the owner of the restaurant")
    end

    # occurred_on is never later than the day it is recorded. A future date is a
    # typo rather than a booking. It may be earlier than the Restaurant's
    # added_at, which is normal and deliberately not checked.
    def occurred_on_or_before_the_day_it_was_recorded
      return if occurred_on.blank? || recorded_at.blank?
      return if occurred_on <= recorded_at.to_date

      errors.add(:occurred_on, "cannot be later than the day it is recorded")
    end
end
