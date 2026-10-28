class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :password_digest, null: false
      t.string :name, null: false

      t.timestamps
    end

    # shortlist.data.md, Identity: a User is its email, case- and
    # whitespace-insensitive. Normalization happens before validation, so the
    # stored value is already lowercased and trimmed and a plain index suffices.
    add_index :users, :email, unique: true
  end
end
