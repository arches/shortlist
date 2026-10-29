require "spec_helper"

ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"

abort("The Rails environment is running in production mode!") if Rails.env.production?

require "rspec/rails"

# shortlist.stack.md: Webmock is the HTTP stubbing. Nothing in the suite reaches
# Google, and an unstubbed call fails loudly rather than going out.
require "webmock/rspec"
WebMock.disable_net_connect!(allow_localhost: true)

# The Places key is server-side configuration. The suite never spends it, but
# the client reads it when it is built, so the test environment carries one.
ENV["SHORTLIST_GOOGLE_PLACES_API_KEY"] ||= "test-places-key"

# The Maps key is the browser's, served by the API per shortlist.principles.md.
# Nothing in the suite draws a map, but the endpoint reads the key when asked
# for it, so the test environment carries one of these too.
ENV["SHORTLIST_GOOGLE_MAPS_API_KEY"] ||= "test-maps-key"

Rails.root.glob("spec/support/**/*.rb").sort_by(&:to_s).each { |f| require f }

begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  abort e.to_s.strip
end

RSpec.configure do |config|
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!

  # Test data is factory_bot; Rails fixtures are not used.
  config.include FactoryBot::Syntax::Methods

  # Several artifacts turn on elapsed time: fifteen minutes, thirty days, and an
  # occurred_on no later than the day it is recorded.
  config.include ActiveSupport::Testing::TimeHelpers
end
