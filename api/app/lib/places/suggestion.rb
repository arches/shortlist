module Places
  # One autocomplete result: the Place ID the owner would be adding, and the
  # line they read to recognise it. The sequence diagram calls these "place ID
  # and description", and nothing else about a suggestion is used.
  Suggestion = Data.define(:google_place_id, :description)
end
