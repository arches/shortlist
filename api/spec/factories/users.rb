FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "owner#{n}@fastmail.com" }
    name { "Sam Reed" }
    password { "correct-horse-battery-staple" }
  end
end
