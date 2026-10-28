FactoryBot.define do
  factory :restaurant do
    user
    sequence(:name) { |n| "Lilia #{n}" }

    trait :removed do
      removed_at { Time.current }
    end

    trait :with_everything do
      name { "Tacos El Bronco" }
      cuisine { "Mexican" }
      specialty { "Suadero tacos" }
      address_line_1 { "4324 4th Ave" }
      city { "Brooklyn" }
      state { "NY" }
      postal_code { "11232" }
      country { "USA" }
      url { "https://tacoselbronco.com" }
      notes { "Cash only, closes early" }
    end
  end
end
