class CreateRefreshTokens < ActiveRecord::Migration[8.1]
  def change
    create_table :refresh_tokens do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }
      t.string :token, null: false
      t.datetime :issued_at, null: false
      t.datetime :expires_at, null: false
    end

    # shortlist.data.md, Identity: a Refresh token is its token value.
    add_index :refresh_tokens, :token, unique: true
  end
end
