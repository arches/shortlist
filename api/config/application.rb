require_relative "boot"

require "rails"
# Pick the frameworks you want:
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
# require "active_storage/engine"
require "action_controller/railtie"
# require "action_mailer/railtie"
# require "action_mailbox/engine"
# require "action_text/engine"
require "action_view/railtie"
# require "action_cable/engine"
# require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Shortlist
  # shortlist.deployment.md gives every environment's fly.<env>.toml a health
  # check. Fly's proxy makes it over plain HTTP on the private network, and the
  # path is one decision read in three places — the route, the SSL redirect
  # exemption below, and production's log silencing — so it is named once here.
  HEALTH_CHECK_PATH = "/up".freeze

  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # Only loads a smaller set of middleware suitable for API only apps.
    # Middleware like session, flash, cookies can be added back manually.
    # Skip views, helpers and assets when generating a new resource.
    config.api_only = true

    # Production forces SSL, and an http-to-https redirect is not the 200 Fly's
    # health check asks for, so an exempt path is what keeps a healthy machine
    # readable as one. The exemption sits here rather than in
    # config/environments/production.rb so that every environment can read it,
    # and it is inert wherever force_ssl is off.
    config.ssl_options = {
      redirect: { exclude: ->(request) { request.path == HEALTH_CHECK_PATH } }
    }
  end
end
