# shortlist.stack.md names Make as the task runner and Docker Compose as the
# local development environment. Everything below therefore runs in a container:
# there is no supported way to run Shortlist on the host.

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
	typecheck migrate console shell shell-frontend user clean

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
