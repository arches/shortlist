# One owner's private record of a place to eat, whether or not they have been
# there. Not a place, a venue or a listing — see shortlist.glossary.md.
class Restaurant < ApplicationRecord
  SHORT_TEXT_LENGTH = 255
  URL_ATTRIBUTES = %i[url google_maps_url yelp_url].freeze
  SHORT_TEXT_ATTRIBUTES = %i[
    address_line_1 address_line_2 city state postal_code country cuisine specialty
  ].freeze

  belongs_to :user

  # shortlist.data.md, Ownership: a Restaurant owns its Experiences. Were a
  # Restaurant ever erased for real, its Experiences would go with it — which is
  # the point of Removed, since a hard delete would destroy the experience
  # history as a side effect of tidying the list.
  has_many :experiences, dependent: :destroy

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

  # shortlist.data.md, Derived: none of the three is stored.

  def experience_count
    experiences.size
  end

  # Visited is the experience count being greater than zero.
  def visited?
    experience_count.positive?
  end

  # The latest occurred_on across a Restaurant's Experiences; absent when it has
  # none, or when none of them carry a date.
  def last_experienced_on
    experiences.maximum(:occurred_on)
  end

  # shortlist.data.md: removed_at never leaves the system in any response. The
  # three derived values are not stored, so they are added here rather than read
  # off the row — the wireframe's card reads "Mexican . visited . 2 experiences".
  #
  # shortlist.stack.md: no serializer library. Where a response differs from the
  # row, an as_json override on the model.
  def as_json(options = nil)
    super(options).except("removed_at").merge(
      "visited" => visited?,
      "experience_count" => experience_count,
      "last_experienced_on" => last_experienced_on
    )
  end

  private
    def set_added_at
      self.added_at ||= Time.current
    end
end
