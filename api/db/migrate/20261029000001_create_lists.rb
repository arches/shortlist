class CreateLists < ActiveRecord::Migration[8.1]
  SHORT_TEXT = 255

  def change
    create_table :lists do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }

      # shortlist.data.md gives name a default of "My List". The default list is
      # created when the User is, so the column default is what a List falls
      # back to rather than something the owner normally sees.
      t.string :name, null: false, limit: SHORT_TEXT, default: "My List"
    end

    # shortlist.data.md, Identity: a List is its name, scoped per user. Unlike a
    # User's email it is not said to be case-insensitive, so the comparison is
    # exact on the trimmed value.
    add_index :lists, [ :user_id, :name ], unique: true
  end
end
