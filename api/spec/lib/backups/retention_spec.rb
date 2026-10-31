require "rails_helper"

# shortlist.deployment.md, Backups: retention is a bucket lifecycle rule, not a
# step in the script. So what is specified here is the rule Tigris is asked to
# enforce — and, as much as that, that asking for it deletes nothing itself.
RSpec.describe Backups::Retention do
  let(:storage) { Aws::S3::Client.new(stub_responses: true) }

  subject(:retention) do
    described_class.new(bucket: "shortlist-db-backups-staging", storage: storage, days: 30)
  end

  def applied
    storage.api_requests.map { |request| request[:params] }
  end

  it "expires the environment's backups after thirty days" do
    retention.apply

    expect(applied.length).to eq(1)
    expect(applied.first[:bucket]).to eq("shortlist-db-backups-staging")
    expect(applied.first.dig(:lifecycle_configuration, :rules)).to eq([ {
      id: "shortlist-backup-retention",
      status: "Enabled",
      filter: { prefix: "" },
      expiration: { days: 30 }
    } ])
  end

  # The rule is named, so the second application replaces the first rather than
  # standing a second one beside it.
  it "leaves one rule however many times it is applied" do
    retention.apply
    retention.apply

    rules = applied.flat_map { |params| params.dig(:lifecycle_configuration, :rules) }

    expect(rules.map { |rule| rule[:id] }.uniq).to eq([ "shortlist-backup-retention" ])
  end

  # The one piece of Shortlist that could remove a backup is this, and it does so
  # by asking Tigris to enforce an age rather than by deleting anything.
  it "deletes nothing itself" do
    retention.apply

    expect(storage.api_requests.map { |request| request[:operation_name] })
      .to eq([ :put_bucket_lifecycle_configuration ])
  end

  it "refuses to run when no bucket is named" do
    was = ENV.delete("BUCKET_NAME")

    expect { described_class.new(storage: storage) }.to raise_error(KeyError)
  ensure
    ENV["BUCKET_NAME"] = was
  end
end
