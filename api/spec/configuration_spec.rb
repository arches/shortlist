require "rails_helper"

# shortlist.stack.md, Backend: Rails is API-only, and migrations leave
# db/schema.rb behind as the checked-in result.
RSpec.describe "Application configuration" do
  it "is API-only, serving JSON and no server-rendered views" do
    expect(Rails.application.config.api_only).to be(true)
  end

  it "records the schema as db/schema.rb rather than structure.sql" do
    expect(ActiveRecord.schema_format).to eq(:ruby)
  end

  # docs/bugs/0001_missing_secret_key_base.md: in CI every example that signed or
  # verified an access token raised KeyError, because the suite read
  # SECRET_KEY_BASE from whatever the runner happened to supply and the pipeline
  # supplied nothing. The test environment carries its own value now, so the
  # suite is self-sufficient wherever it runs.
  #
  # This is a guard on that default rather than a test of the token itself —
  # signing is covered by the session examples. It is the one example that fails
  # if the default is removed or renamed.
  it "carries a key that signs and verifies an access token" do
    user = create(:user)

    expect(AccessToken.owner(AccessToken.issue(user: user))).to eq(user)
  end
end
