# A signed-in owner, expressed the way every request makes itself known: an
# access token in the Authorization header. Shortlist sets no cookie.
module SignInHelpers
  def auth_headers(access_token)
    { "Authorization" => "Bearer #{access_token}" }
  end

  def headers_for(owner)
    auth_headers(AccessToken.issue(user: owner))
  end
end

RSpec.configure do |config|
  config.include SignInHelpers, type: :request
end
