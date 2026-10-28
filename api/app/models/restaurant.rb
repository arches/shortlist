# One wrapper for a Google Place, shared by every List that holds it. Nobody
# owns one. Not a place, a venue or a listing — see shortlist.glossary.md.
class Restaurant < ApplicationRecord
  SHORT_TEXT_LENGTH = 255
  URL_ATTRIBUTES = %i[url google_maps_url yelp_url].freeze
  SHORT_TEXT_ATTRIBUTES = %i[
    address_line_1 address_line_2 city state postal_code country cuisine specialty
  ].freeze

  # shortlist.data.md, Ownership: nothing erases restaurants. A Restaurant
  # outlives every List item that points at it, and the foreign key is what
  # refuses — there is no application path that tries.
  has_many :list_items

  # Every owner's Experiences at this Place, not one owner's. What a response
  # carries is always scoped to the owner asking — see the derived values below.
  has_many :experiences, dependent: :destroy

  normalizes :name, with: ->(name) { name.to_s.strip }

  # shortlist.data.md, Identity: its google place id. Opaque and case-sensitive,
  # so it is neither trimmed nor folded: a Place ID differing in case is a
  # different Place, not the same one typed badly.
  validates :google_place_id, presence: true, uniqueness: true

  # A name, once trimmed, is at least one character. It is cached from Google
  # rather than typed, so it is no longer an identity — two Places may share it.
  validates :name, presence: true, length: { maximum: SHORT_TEXT_LENGTH }

  validates(*URL_ATTRIBUTES, http_url: true)
  validates(*SHORT_TEXT_ATTRIBUTES, length: { maximum: SHORT_TEXT_LENGTH })

  # shortlist.data.md, Derived: none of the three is stored, and all three are
  # one owner's. A Restaurant is never visited in its own right, only visited by
  # somebody, so another owner's Experiences never show on my List item.
  def experiences_of(owner)
    experiences.where(user: owner)
  end

  def experience_count_for(owner)
    experiences_of(owner).count
  end

  # Visited is that count being greater than zero.
  def visited_by?(owner)
    experience_count_for(owner).positive?
  end

  # The latest occurred_on across that owner's Experiences here; absent when
  # they have none, or when none of them carries a date.
  def last_experienced_on_for(owner)
    experiences_of(owner).maximum(:occurred_on)
  end

  # shortlist.stack.md: no serializer library. Where a response differs from the
  # row, an as_json override on the model.
  #
  # The owner is required rather than defaulted. The three derived values are
  # that owner's, and defaulting would quietly report somebody else's counts on
  # my card instead of failing where the mistake was made.
  def as_json(options = nil)
    owner = options&.dig(:owner)
    raise ArgumentError, "a Restaurant is serialized for one owner" if owner.nil?

    super(options.except(:owner)).merge(
      "visited" => visited_by?(owner),
      "experience_count" => experience_count_for(owner),
      "last_experienced_on" => last_experienced_on_for(owner)
    )
  end
end
