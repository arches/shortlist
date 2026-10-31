require "open3"

module Backups
  # One pg_dump of one database, compressed, written into whatever is given to
  # it. Separate from Snapshot so that what takes the dump and what stores it
  # fail separately: a dump that did not finish must never be stored.
  class Dump
    class Failed < StandardError; end

    # Plain SQL, gzipped. Owners and grants are the hosting's business rather
    # than the schema's, and leaving them out is what lets the dump be restored
    # into a database whose role names differ from the one it came out of.
    FLAGS = %w[--no-owner --no-privileges].freeze

    def initialize(database_url: ENV.fetch("DATABASE_URL"))
      @database_url = database_url
    end

    def command
      [ [ "pg_dump", *FLAGS, database_url ], [ "gzip", "--best" ] ]
    end

    # pg_dump's own complaints go to stderr, which on the backup machine is the
    # Fly log. What matters here is that a non-zero exit from either half raises
    # rather than returning a file nobody can restore.
    def into(file)
      statuses = Open3.pipeline(*command, out: file)

      return if statuses.all?(&:success?)

      raise Failed, "pg_dump exited #{statuses.map(&:exitstatus).join(", ")}"
    end

    private
      attr_reader :database_url
  end
end
