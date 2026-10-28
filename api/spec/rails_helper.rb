require "spec_helper"

ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"

abort("The Rails environment is running in production mode!") if Rails.env.production?

require "rspec/rails"

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
