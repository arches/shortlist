# shortlist.deployment.md makes retention a bucket lifecycle rule rather than a
# step in the backup script, so applying it is a separate act from taking a
# backup. It runs on a machine in the environment whose bucket it is about,
# because that is where Fly injects the bucket's name and credentials.
namespace :shortlist do
  namespace :backups do
    desc "Apply the retention lifecycle rule to this environment's backup bucket"
    task retention: :environment do
      days = Backups::Retention.new.apply

      puts "Backups in #{ENV.fetch("BUCKET_NAME")} now expire after #{days} days."
    end
  end
end
