require "rails_helper"

# shortlist.deployment.md, Forbidden connections: no Production node ever reaches
# a Staging resource, and no Staging node ever reaches a Production resource. A
# connection between them risks corrupting production data or user experience.
#
# Those are facts about what must never be wired up, so nothing the application
# does can hold them. What holds them is the checked-in deployment configuration,
# and that is what these examples read: one example per rule, asserting the
# wiring is absent rather than that it misbehaves.
#
# Read with regular expressions rather than a TOML parser. shortlist.stack.md
# names every library Shortlist uses, and a parser for this would be a row in it
# that nothing else needs — these are `key = "value"` lines.
RSpec.describe "The deployment configuration" do
  # The suite runs inside the API container, where Docker Compose mounts api/ as
  # the working directory, so the repository is not Rails.root.parent there. It is
  # mounted read-only and named instead. In CI, where the suite runs against the
  # whole checkout, the default is right.
  REPOSITORY = Pathname(ENV.fetch("SHORTLIST_REPOSITORY_ROOT", Rails.root.parent.to_s))

  # Every Fly resource Shortlist names is `shortlist-` and then what it is, so
  # one pattern finds all of them wherever they appear, in a comment as readily
  # as in a value.
  RESOURCE = /shortlist-[a-z0-9-]+/

  # The one resource both environments touch. shortlist.deployment.md: it holds
  # images only, it is how the promoted artifact reaches Production, and no
  # environment ever reads another environment's data through it.
  SHARED = "shortlist-images".freeze

  ENVIRONMENTS = {
    "production" => REPOSITORY.join("fly.production.toml"),
    "staging" => REPOSITORY.join("fly.staging.toml")
  }.freeze

  def resources_named_in(path)
    path.read.scan(RESOURCE).uniq
  end

  ENVIRONMENTS.each do |environment, config|
    describe "for #{environment}" do
      it "exists, because flyctl deploy reconciles the running app to it" do
        expect(config).to exist
      end

      it "names no resource belonging to another environment" do
        foreign = resources_named_in(config)
          .reject { |resource| resource == SHARED || resource.end_with?("-#{environment}") }

        expect(foreign).to eq([])
      end

      it "deploys the app named for this environment" do
        expect(config.read[/^app = "(.+)"$/, 1]).to eq("shortlist-#{environment}")
      end

      # Drift between the two is silent and total: the path answers, the check
      # asks for another one, and every machine reads as unhealthy.
      it "checks the health path the application answers" do
        expect(config.read[/^\s*path = "(.+)"$/, 1]).to eq(Shortlist::HEALTH_CHECK_PATH)
      end

      it "runs migrations as the release command, so a failed migration fails the deploy" do
        expect(config.read[/^\s*release_command = "(.+)"$/, 1]).to eq("bin/rails db:migrate")
      end
    end
  end

  # shortlist.stack.md: Production is always-on, for first-request latency.
  # shortlist.deployment.md: Staging's app and Postgres stop when idle. Asserted
  # together, because what matters is that they differ.
  it "keeps Production always-on and lets Staging stop when idle" do
    expect(ENVIRONMENTS.fetch("production").read).to include('auto_stop_machines = "off"')
    expect(ENVIRONMENTS.fetch("staging").read).to include('auto_stop_machines = "stop"')
  end

  # shortlist.deployment.md: Local and Test never reach any hosted environment.
  # The local environment is docker-compose.yml and the variables .env.example
  # seeds, so neither may name a hosted resource or a Fly address.
  describe "the local environment" do
    HOSTED = /shortlist-(production|staging)|\.internal|\.flycast|fly\.io/

    [ ".env.example", "docker-compose.yml" ].each do |file|
      it "reaches nothing hosted from #{file}" do
        expect(REPOSITORY.join(file).read.scan(HOSTED)).to eq([])
      end
    end
  end
end
