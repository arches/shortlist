require "tempfile"

module Backups
  # shortlist.deployment.md, Backups: a nightly pg_dump from the backup machine
  # to that environment's Tigris bucket. The machine runs the same image as the
  # app machine and exits when it is done; bin/backup is the whole of its work.
  #
  # Retention is deliberately not here. The artifact makes it a bucket lifecycle
  # rule, so nothing in this class lists or deletes anything, and a bug in it
  # cannot take an old backup with it.
  class Snapshot
    EXTENSION = ".sql.gz".freeze

    # One object per run, named for the moment the dump was taken. The bucket is
    # already per-environment, so nothing else needs to be in the key.
    KEY_FORMAT = "%Y%m%dT%H%M%SZ".freeze

    def self.take(...)
      new(...).take
    end

    # BUCKET_NAME and the AWS_* credentials are injected by Fly when the bucket
    # is provisioned, per shortlist.deployment.md, so they keep the names Fly
    # sets and aws-sdk-s3 reads. See ASSUMPTIONS.md, "What the backup reads".
    def initialize(bucket: ENV.fetch("BUCKET_NAME"), storage: Aws::S3::Client.new, dump: Dump.new)
      @bucket = bucket
      @storage = storage
      @dump = dump
    end

    # Returns the key it stored, which is what bin/backup prints into the log of
    # a machine that has already exited by the time anybody reads it.
    def take(now: Time.now.utc)
      key = "#{now.strftime(KEY_FORMAT)}#{EXTENSION}"

      Tempfile.create([ "shortlist-backup", EXTENSION ], binmode: true) do |file|
        dump.into(file)
        file.rewind

        storage.put_object(bucket: bucket, key: key, body: file)
      end

      key
    end

    private
      attr_reader :bucket, :storage, :dump
  end
end
