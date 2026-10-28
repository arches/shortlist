FactoryBot.define do
  factory :refresh_token do
    user
    sequence(:token) { |n| "token-#{n}-#{SecureRandom.hex(8)}" }
    issued_at { Time.current }
    expires_at { (issued_at || Time.current) + RefreshToken::LIFETIME }
  end
end
