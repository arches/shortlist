class DropTheDetailsAnOwnerSet < ActiveRecord::Migration[8.1]
  SHORT_TEXT = 255
  URL = 2048

  # shortlist.data.md's Restaurant attribute table holds nine columns, all of
  # them Google's. These five were the owner's own, set through an Edit dialog
  # that managing-my-list.scenarios.md no longer has a scenario for.
  def up
    remove_column :restaurants, :url
    remove_column :restaurants, :google_maps_url
    remove_column :restaurants, :yelp_url
    remove_column :restaurants, :specialty
    remove_column :restaurants, :notes
  end

  def down
    add_column :restaurants, :url, :string, limit: URL
    add_column :restaurants, :google_maps_url, :string, limit: URL
    add_column :restaurants, :yelp_url, :string, limit: URL
    add_column :restaurants, :specialty, :string, limit: SHORT_TEXT
    add_column :restaurants, :notes, :text
  end
end
