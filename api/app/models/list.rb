# One group of restaurants, managed by the list owner. Not Shortlist, which is
# the app — see shortlist.glossary.md.
class List < ApplicationRecord
  # shortlist.data.md, Invariants: the default list is called "My List" and is
  # created when the user is created.
  DEFAULT_NAME = "My List".freeze
  SHORT_TEXT_LENGTH = 255

  belongs_to :user

  # A List owns its List items: the rows are the List's, and discarding a List
  # discards the places on it. The Restaurants they point at stand.
  has_many :list_items, dependent: :destroy
  has_many :restaurants, through: :list_items

  normalizes :name, with: ->(name) { name.to_s.strip }

  validates :name, presence: true, length: { maximum: SHORT_TEXT_LENGTH }

  # shortlist.data.md, Identity: its name, scoped per user. Two owners may each
  # have a "My List"; one owner may not have two.
  validates :name, uniqueness: { scope: :user_id }
end
