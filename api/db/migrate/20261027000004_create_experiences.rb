class CreateExperiences < ActiveRecord::Migration[8.1]
  def change
    create_table :experiences do |t|
      t.references :restaurant, null: false, foreign_key: { on_delete: :cascade }
      t.references :user, null: false, foreign_key: { on_delete: :cascade }

      # shortlist.data.md, Enumerations: one of nine values, 1 to 5 in half-star
      # steps. Held as a decimal rather than an enumerated type, because
      # half-stars are a number and arithmetic over them stays obvious.
      t.decimal :rating, precision: 2, scale: 1

      t.text :notes
      t.date :occurred_on

      # When the owner wrote it down, which is not necessarily when it happened.
      t.datetime :recorded_at, null: false
      t.datetime :updated_at, null: false
    end
  end
end
