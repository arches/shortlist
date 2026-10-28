FactoryBot.define do
  factory :experience do
    restaurant
    user { restaurant.user }
    rating { 4.5 }
    notes { "The clam pie is the one" }
    occurred_on { Date.current }
  end
end
