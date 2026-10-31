require "rails_helper"
require "rake"

# The task an operator runs once, when the bucket is provisioned.
# shortlist.deployment.md keeps retention out of the backup script, so this is
# the only thing that applies it.
RSpec.describe "shortlist:backups:retention" do
  before(:all) do
    Rails.application.load_tasks if Rake::Task.tasks.empty?
  end

  let(:task) { Rake::Task["shortlist:backups:retention"] }

  after { task.reenable }

  it "applies the rule to the bucket Fly injected" do
    retention = instance_double(Backups::Retention, apply: 30)
    allow(Backups::Retention).to receive(:new).and_return(retention)

    with_bucket_name("shortlist-db-backups-staging") do
      expect { task.invoke }.to output(/shortlist-db-backups-staging.*30 days/).to_stdout
    end

    expect(retention).to have_received(:apply)
  end

  def with_bucket_name(name)
    was = ENV["BUCKET_NAME"]
    ENV["BUCKET_NAME"] = name
    yield
  ensure
    ENV["BUCKET_NAME"] = was
  end
end
