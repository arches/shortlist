class CreateListItems < ActiveRecord::Migration[8.1]
  def change
    create_table :list_items do |t|
      t.references :list, null: false, foreign_key: { on_delete: :cascade }

      # No on_delete, so Postgres refuses the delete outright.
      # shortlist.data.md, Ownership: nothing erases restaurants, and a
      # Restaurant outlives every List item that points at it.
      t.references :restaurant, null: false, foreign_key: true

      # shortlist.data.md's attribute table names added_at and updated_at, and
      # no created_at. Rails manages updated_at by name; added_at is set when
      # the owner puts the Restaurant on the List.
      t.datetime :added_at, null: false
      t.datetime :updated_at, null: false
    end

    # shortlist.data.md, Identity: a List item is its List and its Restaurant
    # together. One List never holds the same Restaurant twice.
    add_index :list_items, [ :list_id, :restaurant_id ], unique: true
  end
end
