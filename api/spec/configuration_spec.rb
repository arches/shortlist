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
end
