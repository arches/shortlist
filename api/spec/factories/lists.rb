FactoryBot.define do
  factory :list do
    user

    # Not the default name: creating a User already creates their "My List", and
    # a List is its name scoped per user.
    sequence(:name) { |n| "Places to try #{n}" }
  end
end
