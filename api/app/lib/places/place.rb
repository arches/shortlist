module Places
  # One Google Place, reduced to the Restaurant attributes shortlist.data.md
  # marks "Cached value from Google Place data". Nothing else is kept: a field
  # Shortlist does not store is a field it does not ask Google for.
  Place = Data.define(
    :google_place_id,
    :name,
    :address_line_1,
    :address_line_2,
    :city,
    :state,
    :postal_code,
    :country,
    :cuisine,
    :latitude,
    :longitude
  ) do
    def to_restaurant_attributes
      to_h
    end
  end
end
