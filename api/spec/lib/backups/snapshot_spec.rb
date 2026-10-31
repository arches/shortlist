require "rails_helper"

# shortlist.deployment.md, Backups: a nightly pg_dump from the backup machine to
# that environment's Tigris bucket, and retention is a bucket lifecycle rule
# rather than a step in the script.
RSpec.describe Backups::Snapshot do
  # Tigris is reached with S3 tooling, per shortlist.stack.md, so the stubbed S3
  # client is the right stand-in for it. Nothing here reaches a bucket.
  let(:storage) { Aws::S3::Client.new(stub_responses: true) }

  # The dump is stood in for: pg_dump refuses a server newer than itself, and the
  # client in the development image is older than the Postgres 18 the suite runs
  # against. What is being specified is what happens to the dump, not how it is
  # taken — Backups::Dump covers that.
  let(:dump) { instance_double(Backups::Dump) }

  subject(:snapshot) do
    described_class.new(bucket: "shortlist-db-backups-staging", storage: storage, dump: dump)
  end

  # Read as the request is made rather than afterwards: the dump is a temporary
  # file, and it is closed and gone by the time an example could ask the stub for
  # it. What is being checked is what was sent, which is what this records.
  let(:stored) { [] }

  before do
    storage.stub_responses(:put_object, lambda { |context|
      stored << {
        bucket: context.params[:bucket],
        key: context.params[:key],
        body: context.params[:body].read
      }

      {}
    })
  end

  def dump_writes(contents)
    allow(dump).to receive(:into) { |file| file.write(contents) }
  end

  it "stores the dump in the bucket it was given" do
    dump_writes("-- a dump")

    snapshot.take

    expect(stored).to eq([ {
      bucket: "shortlist-db-backups-staging",
      key: key_at(Time.now.utc),
      body: "-- a dump"
    } ])
  end

  def key_at(time)
    "#{time.strftime("%Y%m%dT%H%M%SZ")}.sql.gz"
  end

  it "names the object for the moment the dump was taken" do
    dump_writes("-- a dump")

    key = snapshot.take(now: Time.utc(2026, 10, 30, 7, 5, 9))

    expect(key).to eq("20261030T070509Z.sql.gz")
    expect(stored.first[:key]).to eq("20261030T070509Z.sql.gz")
  end

  it "stores nothing when the dump did not finish" do
    allow(dump).to receive(:into).and_raise(Backups::Dump::Failed)

    expect { snapshot.take }.to raise_error(Backups::Dump::Failed)
    expect(stored).to eq([])
  end

  # Retention is a bucket lifecycle rule, per the artifact. Nothing here lists or
  # deletes, so no bug in it can take an old backup with it.
  it "removes nothing" do
    dump_writes("-- a dump")

    snapshot.take

    expect(storage.api_requests.map { |request| request[:operation_name] }).to eq([ :put_object ])
  end

  it "reads the bucket it stores into from the environment" do
    with_no_bucket_name do
      expect { described_class.new(storage: storage, dump: dump) }.to raise_error(KeyError)
    end
  end

  def with_no_bucket_name
    was = ENV.delete("BUCKET_NAME")
    yield
  ensure
    ENV["BUCKET_NAME"] = was
  end
end
