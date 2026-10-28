class RestaurantsAreSharedGooglePlaces < ActiveRecord::Migration[8.1]
  def up
    # A Place ID cannot be invented for a row created without one, and nothing
    # in Shortlist could look one up from a name somebody typed. There is no
    # production data and local data is reproducible, so the rows go rather than
    # being given a value that would be a lie. Experiences go with them, through
    # their own cascade. See ASSUMPTIONS.md, "Restaurants that predate the Place
    # ID", and `make clean` for the rest of the story.
    execute "DELETE FROM list_items"
    execute "DELETE FROM restaurants"

    add_column :restaurants, :google_place_id, :string
    change_column_null :restaurants, :google_place_id, false

    # shortlist.data.md, Identity: a Restaurant is its google place id, and
    # there is one row per Place for the whole system. ADR 0001 is what makes
    # that the deduplication, within one List and across every List there is.
    add_index :restaurants, :google_place_id, unique: true

    # The name is no longer an identity. "Adding a restaurant that is already on
    # my list" is now the List item's uniqueness, not the name's, and two owners
    # with the same Place share one row rather than colliding.
    remove_index :restaurants, name: "index_restaurants_on_user_id_and_lower_name"

    # Nobody owns a Restaurant. What an owner has is a List item pointing at
    # one, which carries added_at; and taking a Restaurant off a List destroys
    # that row outright, so there is nothing left for Removed to mean.
    remove_reference :restaurants, :user, foreign_key: true
    remove_column :restaurants, :added_at, :datetime
    remove_column :restaurants, :removed_at, :datetime

    # Rails manages created_at by name, and shortlist.data.md's attribute table
    # names it where added_at used to be.
    add_column :restaurants, :created_at, :datetime
    execute "UPDATE restaurants SET created_at = CURRENT_TIMESTAMP"
    change_column_null :restaurants, :created_at, false
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
