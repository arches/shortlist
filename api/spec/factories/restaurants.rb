FactoryBot.define do
  factory :restaurant do
    sequence(:google_place_id) { |n| "ChIJShortlistFixture#{n}" }
    sequence(:name) { |n| "Lilia #{n}" }

    # Nobody owns a Restaurant. What an owner has is a List item pointing at
    # one, so putting a Place on somebody's list is what this says — and it is
    # what a spec nearly always means by naming an owner.
    transient do
      on_the_list_of { nil }
    end

    after(:create) do |restaurant, evaluator|
      next if evaluator.on_the_list_of.nil?

      create(:list_item, list: evaluator.on_the_list_of.lists.sole, restaurant: restaurant)
    end

    # Everything Google sends back about a Place.
    trait :with_everything do
      name { "Tacos El Bronco" }
      cuisine { "Mexican" }
      address_line_1 { "4324 4th Ave" }
      address_line_2 { "Suite 2" }
      city { "Brooklyn" }
      state { "NY" }
      postal_code { "11232" }
      country { "USA" }
    end
  end
end
