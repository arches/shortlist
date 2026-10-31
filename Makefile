# shortlist.stack.md names Make as the task runner and Docker Compose as the
# local development environment, so every target that runs Shortlist runs it in a
# container: there is no supported way to run it on the host.
#
# The provisioning section at the bottom is the exception. flyctl talks to Fly
# rather than running Shortlist, and shortlist.stack.md names it as the
# infrastructure management tool, so it runs on the host.

# .env supplies SHORTLIST_TEST_DATABASE_URL below. Make builds it from
# .env.example on first use and then restarts itself.
include .env

COMPOSE := docker compose
RUN_API := $(COMPOSE) run --rm api
RUN_TEST := $(COMPOSE) run --rm \
	-e RAILS_ENV=test \
	-e DATABASE_URL=$(SHORTLIST_TEST_DATABASE_URL) \
	api
# --no-deps: the frontend's own checks need neither the API nor Postgres. The
# dev server does, which is what the service's depends_on is for.
RUN_FRONTEND := $(COMPOSE) run --rm --no-deps frontend

.DEFAULT_GOAL := help
.PHONY: help up down build test test-api test-frontend lint lint-api lint-frontend \
	typecheck migrate console shell shell-frontend user clean \
	check-environment provision provision-registry provision-app \
	provision-database-app provision-database provision-bucket provision-backup \
	backup-retention certificate secrets database-secrets

help: ## List the targets
	@grep -hE '^[a-z][a-z-]*:.*?## ' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

.env:
	cp .env.example .env

up: .env ## Start Postgres, the API and the frontend dev server
	$(COMPOSE) up

down: ## Stop everything
	$(COMPOSE) down

build: .env ## Rebuild the images, after a Gemfile or package.json change
	$(COMPOSE) build

test: test-api test-frontend ## Run both test suites

test-api: .env ## Run the API test suite
	$(RUN_TEST) bash -c "bin/rails db:prepare && bundle exec rspec"

test-frontend: .env ## Run the frontend test suite
	$(RUN_FRONTEND) pnpm test

lint: lint-api lint-frontend ## Lint both halves

lint-api: .env ## Run RuboCop
	$(RUN_API) bin/rubocop

lint-frontend: .env ## Run oxlint
	$(RUN_FRONTEND) pnpm lint

typecheck: .env ## Type-check the frontend
	$(RUN_FRONTEND) pnpm typecheck

migrate: .env ## Run pending migrations
	$(RUN_API) bin/rails db:migrate

console: .env ## Open a Rails console
	$(RUN_API) bin/rails console

shell: .env ## Open a shell in the API container
	$(RUN_API) bash

shell-frontend: .env ## Open a shell in the frontend container
	$(RUN_FRONTEND) bash

user: .env ## Create an account by hand: make user EMAIL=.. NAME=.. PASSWORD=..
	$(RUN_API) bin/rails "shortlist:user:create[$(EMAIL),$(NAME),$(PASSWORD)]"

clean: ## Stop everything and discard the database volume
	$(COMPOSE) down --volumes

# ---- Provisioning -----------------------------------------------------------
# shortlist.deployment.md: "One-time provisioning is not in fly.toml: creating
# the apps, volumes, Postgres, Tigris buckets and certificates is a Make target
# of idempotent flyctl commands." Idempotent means running one twice is safe and
# running one again after it failed half way finishes the job.
#
# The registry is created once for the organization:
#
#   0. make provision-registry
#
# Then, per environment:
#
#   1. make database-secrets ENVIRONMENT=staging SECRETS_FILE=~/secrets/staging-db.env
#   2. make secrets          ENVIRONMENT=staging SECRETS_FILE=~/secrets/staging.env
#   3. make provision        ENVIRONMENT=staging
#   4. push to main, and let the pipeline deploy
#   5. make provision-backup ENVIRONMENT=staging
#   6. make backup-retention ENVIRONMENT=staging
#   7. make certificate      ENVIRONMENT=staging DOMAIN=...   (optional)
#
# A secret has to have an app to live in, so steps 1 and 2 create the app they
# set secrets on. That is why they come before step 3 rather than after it: the
# Postgres machine reads its password at startup, so the secret has to be there
# before the machine is created.
#
# Steps 5 to 7 come after a deploy. The backup machine runs the app's image,
# which does not exist in the registry until the pipeline has pushed it once;
# the retention rule is applied by a machine in the environment; and a
# certificate is for a domain that resolves to a running app.
#
# ENVIRONMENT rather than ENV, deliberately: ENV is exported in some shells, and
# make takes an exported variable over a default. Provisioning the wrong
# environment by inheriting a stray value is the expensive mistake
# shortlist.deployment.md's forbidden connections are about.
ENVIRONMENT ?= staging
ORG ?= personal

ENVIRONMENTS := staging production

# shortlist.deployment.md: Fly app names and Tigris bucket names are unique
# across all of Fly, so every name Shortlist claims carries this owner prefix.
PREFIX := arches-shortlist

# Every Fly resource is derived from the prefix and the one variable, so no
# target can be pointed at one environment and act on another's resources.
APP := $(PREFIX)-$(ENVIRONMENT)
DATABASE_APP := $(PREFIX)-db-$(ENVIRONMENT)
BUCKET := $(PREFIX)-db-backups-$(ENVIRONMENT)

# shortlist.deployment.md: the registry is a Fly app that holds images only and
# runs nothing. Both environments pull from it, so it belongs to the
# organization rather than to an environment, and takes no ENVIRONMENT.
REGISTRY := $(PREFIX)-images

# Decided in fly.$(ENVIRONMENT).toml and read from it, so where an environment
# runs has one answer rather than two.
REGION = $(shell sed -n 's/^primary_region = "\(.*\)"$$/\1/p' fly.$(ENVIRONMENT).toml)

# shortlist.deployment.md leaves the volume size TBD. See ASSUMPTIONS.md.
VOLUME_GB ?= 1

# shortlist.stack.md: PostgreSQL 18, self-managed in a container, and the same
# image Docker Compose runs locally.
POSTGRES_IMAGE := postgres:18
POSTGRES_VM := --vm-size shared-cpu-1x --vm-memory 512

# The backup machine runs the same image as the app machine, per
# shortlist.deployment.md. It is created once and not redeployed: all it needs is
# pg_dump, which the image pins to the server's major version, and bin/backup.
BACKUP_IMAGE ?= registry.fly.io/$(REGISTRY):$(shell git rev-parse HEAD)

ifeq ($(ENVIRONMENT),staging)
# shortlist.deployment.md: Staging's app and Postgres stop when idle. A machine
# the Fly proxy can stop has to be reached through the proxy, so this
# environment's DATABASE_URL names .flycast where production's names .internal.
POSTGRES_IDLE := --autostop=stop --autostart
else
POSTGRES_IDLE := --autostop=off
endif

check-environment:
	@echo "$(ENVIRONMENTS)" | grep -qw "$(ENVIRONMENT)" || { \
		echo "ENVIRONMENT must be one of: $(ENVIRONMENTS)"; exit 1; }

provision: provision-app provision-database provision-bucket ## Create an environment: make provision ENVIRONMENT=staging

provision-registry: ## Create the shared image registry app, once per organization
	@flyctl apps create $(REGISTRY) --org $(ORG) 2>/dev/null || echo "$(REGISTRY) exists already"
	@echo "It holds images only. The pipeline's build job pushes them here."

provision-app: check-environment ## Create the app that serves the API and the frontend
	@flyctl apps create $(APP) --org $(ORG) 2>/dev/null || echo "$(APP) exists already"
	@echo "Addresses are allocated by the first deploy, which the pipeline makes."

provision-database-app: check-environment ## Create this environment's Postgres app, and nothing in it
	@flyctl apps create $(DATABASE_APP) --org $(ORG) 2>/dev/null || echo "$(DATABASE_APP) exists already"

provision-database: provision-database-app ## Create this environment's Postgres volume and machine
	@flyctl secrets list --app $(DATABASE_APP) | grep -q POSTGRES_PASSWORD || { \
		echo "Set this database's secrets first:"; \
		echo "  make database-secrets ENVIRONMENT=$(ENVIRONMENT) SECRETS_FILE=..."; exit 1; }
	@flyctl volumes list --app $(DATABASE_APP) | grep -q pgdata || \
		flyctl volumes create pgdata --app $(DATABASE_APP) --region $(REGION) --size $(VOLUME_GB) --yes
	@flyctl machine list --app $(DATABASE_APP) | grep -q postgres || \
		flyctl machine run $(POSTGRES_IMAGE) --app $(DATABASE_APP) --region $(REGION) \
			--volume pgdata:/var/lib/postgresql $(POSTGRES_VM) \
			--port 5432:5432/tcp $(POSTGRES_IDLE)

provision-bucket: check-environment ## Create this environment's Tigris backup bucket
	@flyctl storage list --app $(APP) | grep -q $(BUCKET) || \
		flyctl storage create --name $(BUCKET) --app $(APP) --yes
	@echo "Fly injects this bucket's credentials into $(APP) as secrets."
	@echo "Apply its retention rule once the app is deployed:"
	@echo "  make backup-retention ENVIRONMENT=$(ENVIRONMENT)"

# Separate from `provision`, because it runs the app's image: until the pipeline
# has pushed that image once, there is nothing for this machine to run.
provision-backup: check-environment ## Create the nightly backup machine, once the image is pushed
	@flyctl machine list --app $(APP) | grep -q backup || \
		flyctl machine run $(BACKUP_IMAGE) --app $(APP) --region $(REGION) \
			--name backup --schedule daily $(POSTGRES_VM) bin/backup

backup-retention: check-environment ## Apply the backup retention rule, once the app is deployed
	flyctl ssh console --app $(APP) --command "bin/rails shortlist:backups:retention"

certificate: check-environment ## Add a certificate: make certificate ENVIRONMENT=production DOMAIN=...
	@test -n "$(DOMAIN)" || { echo "DOMAIN=... is required. No artifact names one."; exit 1; }
	flyctl certs add $(DOMAIN) --app $(APP)

# shortlist.deployment.md: runtime secrets are set per app and their values live
# only in Fly. The names are in .env.example. Read from a file rather than taken
# as arguments, so no value reaches the Makefile, the repository or a shell
# history.
# Each depends on the app it writes to existing, because flyctl has nowhere to
# put a secret otherwise. Creating the app is idempotent, so this is the step
# that breaks what would otherwise be a cycle: the Postgres machine cannot be
# created before its password is set, and the password cannot be set before
# there is an app to set it on.
secrets: provision-app ## Create the app if needed and set its runtime secrets: make secrets ENVIRONMENT=staging SECRETS_FILE=...
	@test -n "$(SECRETS_FILE)" || { echo "SECRETS_FILE=... is required"; exit 1; }
	flyctl secrets import --app $(APP) < $(SECRETS_FILE)

database-secrets: provision-database-app ## Create the Postgres app if needed and set its secrets: make database-secrets ENVIRONMENT=staging SECRETS_FILE=...
	@test -n "$(SECRETS_FILE)" || { echo "SECRETS_FILE=... is required"; exit 1; }
	flyctl secrets import --app $(DATABASE_APP) < $(SECRETS_FILE)
