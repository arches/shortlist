require "rails_helper"

# shortlist.deployment.md, Backups: a nightly pg_dump. The one thing that must
# hold is that a dump which did not finish is never handed on to be stored.
RSpec.describe Backups::Dump do
  subject(:dump) { described_class.new(database_url: "postgres://shortlist@db:5432/shortlist_test") }

  it "dumps the database it was given, compressed" do
    expect(dump.command).to eq([
      [ "pg_dump", "--no-owner", "--no-privileges", "postgres://shortlist@db:5432/shortlist_test" ],
      [ "gzip", "--best" ]
    ])
  end

  # Against the real pg_dump, pointed at nothing. A dump that cannot run is the
  # same failure as one that breaks half way: a non-zero exit, and nothing
  # downstream may treat the file as a backup.
  it "raises rather than leaving a file that cannot be restored" do
    unreachable = described_class.new(database_url: "postgres://nobody@127.0.0.1:1/nothing")

    Tempfile.create([ "unfinished", ".sql.gz" ], binmode: true) do |file|
      expect { unreachable.into(file) }.to raise_error(Backups::Dump::Failed)
    end
  end

  # shortlist.stack.md: configuration is environment variables read through
  # ENV.fetch. A backup machine with no database named has nothing to dump, and
  # saying so on boot is better than a zero-byte object nobody notices.
  it "refuses to run when no database is named" do
    with_no_database_url do
      expect { described_class.new }.to raise_error(KeyError)
    end
  end

  def with_no_database_url
    was = ENV.delete("DATABASE_URL")
    yield
  ensure
    ENV["DATABASE_URL"] = was
  end
end
