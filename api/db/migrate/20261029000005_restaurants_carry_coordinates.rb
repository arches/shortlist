class RestaurantsCarryCoordinates < ActiveRecord::Migration[8.1]
  # shortlist.data.md's Restaurant attribute table says "number" and no more, so
  # the precision is a reading rather than a transcription — see ASSUMPTIONS.md,
  # "How precise a coordinate is". Seven decimal places is about a centimetre,
  # which is finer than a Place ever needs, and a decimal rather than a float so
  # the value round-trips as Google sent it.
  PRECISION = 10
  SCALE = 7

  def change
    # Both optional, like the seven cached values beside them: a Place Details
    # response without a location leaves them absent rather than failing. Rows
    # that predate this migration keep them absent for good, because nothing
    # re-reads a cached Place — see ASSUMPTIONS.md, "Coordinates for restaurants
    # already on a list".
    add_column :restaurants, :latitude, :decimal, precision: PRECISION, scale: SCALE
    add_column :restaurants, :longitude, :decimal, precision: PRECISION, scale: SCALE
  end
end
