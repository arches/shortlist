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

  # Every Fly resource Shortlist names is the `arches-shortlist-` owner prefix
  # and then what it is, so one pattern finds all of them wherever they appear,
  # in a comment as readily as in a value.
  #
  # The lookahead is what tells a literal name from a derived one: the Makefile's
  # `$(PREFIX)-db-$(ENVIRONMENT)` names no environment and is not a finding,
  # while `arches-shortlist-db-staging` written out is exactly what these
  # examples look for. Possessive, so the pattern cannot backtrack into matching
  # the prefix of an interpolated name.
  RESOURCE = /arches-shortlist-[a-z0-9-]++(?!\$)/

  # The owner prefix every name carries, per shortlist.deployment.md: Fly app
  # names and Tigris bucket names are unique across all of Fly, not within an
  # organization, so the unprefixed names were never ours to claim.
  PREFIX = "arches-shortlist".freeze

  # The one resource both environments touch. shortlist.deployment.md: it holds
  # images only, it is how the promoted artifact reaches Production, and no
  # environment ever reads another environment's data through it.
  SHARED = "#{PREFIX}-images".freeze

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
        expect(config.read[/^app = "(.+)"$/, 1]).to eq("#{PREFIX}-#{environment}")
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

  # shortlist.deployment.md: one-time provisioning is a Make target of idempotent
  # flyctl commands. Its isolation is structural rather than asserted at run
  # time — every resource name is built from the one environment the target was
  # given — so these examples hold that shape in place.
  describe "the provisioning targets" do
    let(:makefile) { REPOSITORY.join("Makefile").read }

    it "name no environment's resources literally" do
      literal = makefile.scan(RESOURCE).uniq.reject { |resource| resource == SHARED }

      expect(literal).to eq([])
    end

    it "derive every Fly resource from the environment they were given" do
      expect(makefile).to include("PREFIX := arches-shortlist")
      expect(makefile).to include("APP := $(PREFIX)-$(ENVIRONMENT)")
      expect(makefile).to include("DATABASE_APP := $(PREFIX)-db-$(ENVIRONMENT)")
      expect(makefile).to include("BUCKET := $(PREFIX)-db-backups-$(ENVIRONMENT)")
    end

    # A misspelled environment would otherwise create a stray app beside the real
    # ones, with a volume and a bucket of its own and nothing watching it.
    it "provision only the environments that have a configuration" do
      allowed = makefile[/^ENVIRONMENTS := (.+)$/, 1].split

      expect(allowed.sort).to eq(ENVIRONMENTS.keys.sort)
    end
  end

  # shortlist.deployment.md states two things about the pipeline as load-bearing
  # rather than incidental, and both are checkable here: which jobs can read the
  # deploy credential, and that promotion moves one image rather than building a
  # second one.
  describe "the pipeline" do
    let(:pipeline) { YAML.load_file(REPOSITORY.join(".github/workflows/pipeline.yml")) }
    let(:jobs) { pipeline.fetch("jobs") }

    def deploy_command(environment)
      jobs.fetch("deploy-#{environment}")
        .fetch("steps")
        .filter_map { |step| step["run"] }
        .sole
    end

    # "The repo is public, so the test jobs must never be able to read it."
    # Binding a job to a GitHub Environment is what gives it a credential, so a
    # job with no environment has nothing to read — and the two test jobs are
    # the only jobs that run on a pull request.
    it "lets no job outside a deployment environment read the Fly token" do
      unbound = jobs.reject { |_name, job| job.key?("environment") }

      expect(unbound.keys).to eq([ "test-backend", "test-frontend" ])
      expect(unbound.to_s).not_to include("FLY_API_TOKEN")
    end

    it "deploys each environment with its own configuration" do
      ENVIRONMENTS.each_key do |environment|
        expect(deploy_command(environment)).to include("--config fly.#{environment}.toml")
      end
    end

    # "Nothing is rebuilt to promote. Both deploy jobs reference the same image
    # tag, so what gets approved is the artifact the tests passed against."
    it "promotes one image rather than building a second one" do
      images = ENVIRONMENTS.keys.map { |environment| deploy_command(environment)[/--image (.+)\z/, 1] }

      expect(images.uniq.length).to eq(1)
      expect(images.first).to include(SHARED)
      expect(jobs.values_at(*ENVIRONMENTS.keys.map { |e| "deploy-#{e}" }).to_s)
        .not_to include("build-push")
    end
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
