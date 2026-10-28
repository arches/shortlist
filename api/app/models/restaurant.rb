# One owner's private record of a place to eat, whether or not they have been
# there. Not a place, a venue or a listing — see shortlist.glossary.md.
class Restaurant < ApplicationRecord
  SHORT_TEXT_LENGTH = 255
  URL_ATTRIBUTES = %i[url google_maps_url yelp_url].freeze
  SHORT_TEXT_ATTRIBUTES = %i[
    address_line_1 address_line_2 city state postal_code country cuisine specialty
  ].freeze

  belongs_to :user

  # shortlist.data.md, Derived: Removed is the presence of removed_at. The List
  # is the set of one owner's non-removed Restaurants — informal, not an entity.
  scope :on_the_list, -> { where(removed_at: nil) }

  normalizes :name, with: ->(name) { name.to_s.strip }

  before_validation :set_added_at, on: :create

  # A name, once trimmed, is at least one character. Whitespace alone is not a
  # name, and it is the only thing a Restaurant cannot be created without.
  validates :name, presence: true, length: { maximum: SHORT_TEXT_LENGTH }
  validates :name,
    uniqueness: {
      scope: :user_id,
      case_sensitive: false,
      conditions: -> { on_the_list },
      message: "is already on your list"
    },
    unless: :removed?

  validates :added_at, presence: true
  validates(*URL_ATTRIBUTES, http_url: true)
  validates(*SHORT_TEXT_ATTRIBUTES, length: { maximum: SHORT_TEXT_LENGTH })

  def removed?
    removed_at.present?
  end

  # shortlist.data.md: removed_at never leaves the system in any response.
  def as_json(options = nil)
    super(options).except("removed_at")
  end

  private
    def set_added_at
      self.added_at ||= Time.current
    end
end
