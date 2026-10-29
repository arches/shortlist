# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_29_000005) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "experiences", force: :cascade do |t|
    t.bigint "restaurant_id", null: false
    t.bigint "user_id", null: false
    t.decimal "rating", precision: 2, scale: 1
    t.text "notes"
    t.date "occurred_on"
    t.datetime "recorded_at", null: false
    t.datetime "updated_at", null: false
    t.index ["restaurant_id"], name: "index_experiences_on_restaurant_id"
    t.index ["user_id"], name: "index_experiences_on_user_id"
  end

  create_table "list_items", force: :cascade do |t|
    t.bigint "list_id", null: false
    t.bigint "restaurant_id", null: false
    t.datetime "added_at", null: false
    t.datetime "updated_at", null: false
    t.index ["list_id", "restaurant_id"], name: "index_list_items_on_list_id_and_restaurant_id", unique: true
    t.index ["list_id"], name: "index_list_items_on_list_id"
    t.index ["restaurant_id"], name: "index_list_items_on_restaurant_id"
  end

  create_table "lists", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", limit: 255, default: "My List", null: false
    t.index ["user_id", "name"], name: "index_lists_on_user_id_and_name", unique: true
    t.index ["user_id"], name: "index_lists_on_user_id"
  end

  create_table "refresh_tokens", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "token", null: false
    t.datetime "issued_at", null: false
    t.datetime "expires_at", null: false
    t.index ["token"], name: "index_refresh_tokens_on_token", unique: true
    t.index ["user_id"], name: "index_refresh_tokens_on_user_id"
  end

  create_table "restaurants", force: :cascade do |t|
    t.string "name", limit: 255, null: false
    t.string "address_line_1", limit: 255
    t.string "address_line_2", limit: 255
    t.string "city", limit: 255
    t.string "state", limit: 255
    t.string "postal_code", limit: 255
    t.string "country", limit: 255
    t.string "cuisine", limit: 255
    t.datetime "updated_at", null: false
    t.string "google_place_id", null: false
    t.datetime "created_at", null: false
    t.decimal "latitude", precision: 10, scale: 7
    t.decimal "longitude", precision: 10, scale: 7
    t.index ["google_place_id"], name: "index_restaurants_on_google_place_id", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.string "email", null: false
    t.string "password_digest", null: false
    t.string "name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "experiences", "restaurants", on_delete: :cascade
  add_foreign_key "experiences", "users", on_delete: :cascade
  add_foreign_key "list_items", "lists", on_delete: :cascade
  add_foreign_key "list_items", "restaurants"
  add_foreign_key "lists", "users", on_delete: :cascade
  add_foreign_key "refresh_tokens", "users", on_delete: :cascade
end
