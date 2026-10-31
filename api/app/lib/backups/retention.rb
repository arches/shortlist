module Backups
  # shortlist.deployment.md, Backups: "Retention is a bucket lifecycle rule, not
  # a step in the script." This applies that rule. Nothing calls it on a
  # schedule and bin/backup never touches it — it is applied once, when the
  # bucket is provisioned, and again only if the rule changes.
  #
  # The separation is the point. A lifecycle rule is enforced by Tigris, so no
  # failure, bug or bad argument in Shortlist can delete a backup; the only code
  # that could is here, where it runs by hand.
  class Retention
    DAYS = 30

    # Named, so re-applying replaces this rule rather than adding a second one
    # beside it. Applying twice leaves the bucket as it was after once.
    RULE = "shortlist-backup-retention".freeze

    def initialize(bucket: ENV.fetch("BUCKET_NAME"), storage: Aws::S3::Client.new, days: DAYS)
      @bucket = bucket
      @storage = storage
      @days = days
    end

    def apply
      storage.put_bucket_lifecycle_configuration(
        bucket: bucket,
        lifecycle_configuration: {
          rules: [ {
            id: RULE,
            status: "Enabled",
            # Every object in the bucket. It holds this environment's dumps and
            # nothing else, so there is nothing to exclude.
            filter: { prefix: "" },
            expiration: { days: days }
          } ]
        }
      )

      days
    end

    private
      attr_reader :bucket, :storage, :days
  end
end
