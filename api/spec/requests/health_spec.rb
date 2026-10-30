require "rails_helper"

# shortlist.deployment.md gives every environment's fly.<env>.toml a health
# check, and Fly stops routing traffic to a machine that fails one. Two things
# have to hold for a healthy machine to read as healthy, and they are separate
# failures: the path has to answer, and the http-to-https redirect production
# turns on has to let the proxy's plain-HTTP check through.
RSpec.describe "The health check" do
  it "answers at the path the deployment configuration checks" do
    get Shortlist::HEALTH_CHECK_PATH

    expect(response).to have_http_status(:ok)
  end

  # Checked here rather than in production, where force_ssl is on and this
  # exemption is what stops the check being answered with a 301. The option is
  # set in config/application.rb so every environment can read it; this is the
  # example that reads it.
  describe "exemption from the SSL redirect" do
    let(:exclude) { Rails.application.config.ssl_options.dig(:redirect, :exclude) }

    def excluded?(path)
      exclude.call(instance_double(ActionDispatch::Request, path: path))
    end

    it "lets the health check through" do
      expect(excluded?(Shortlist::HEALTH_CHECK_PATH)).to be true
    end

    it "redirects everything else" do
      expect(excluded?("/")).to be false
      expect(excluded?("/api/configuration")).to be false
    end
  end
end
