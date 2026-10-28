class CreateRestaurants < ActiveRecord::Migration[8.1]
  SHORT_TEXT = 255
  URL = 2048

  def change
    create_table :restaurants do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }

      t.string :name, null: false, limit: SHORT_TEXT

      t.string :url, limit: URL
      t.string :google_maps_url, limit: URL
      t.string :yelp_url, limit: URL

      t.string :address_line_1, limit: SHORT_TEXT
      t.string :address_line_2, limit: SHORT_TEXT
      t.string :city, limit: SHORT_TEXT
      t.string :state, limit: SHORT_TEXT
      t.string :postal_code, limit: SHORT_TEXT
      t.string :country, limit: SHORT_TEXT

      t.string :cuisine, limit: SHORT_TEXT
      t.string :specialty, limit: SHORT_TEXT
      t.text :notes

      # shortlist.data.md's attribute table names added_at and updated_at, and
      # no created_at. Rails manages updated_at by name; added_at is set when
      # the Restaurant goes on the list.
      t.datetime :added_at, null: false
      t.datetime :updated_at, null: false

      # Its presence is what Removed means.
      t.datetime :removed_at
    end

    # shortlist.data.md, Identity: name, case- and whitespace-insensitive, within
    # one owner's non-removed Restaurants. A name is reusable once the Restaurant
    # carrying it is Removed, which is what makes the index a partial one.
    add_index :restaurants,
      "user_id, lower(name)",
      unique: true,
      where: "removed_at IS NULL",
      name: "index_restaurants_on_user_id_and_lower_name"
  end
end
