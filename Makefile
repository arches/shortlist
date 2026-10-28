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

.DEFAULT_GOAL := help
.PHONY: help up down build test lint migrate console shell clean

help: ## List the targets
	@grep -hE '^[a-z][a-z-]*:.*?## ' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

.env:
	cp .env.example .env

up: .env ## Start Postgres and the API
	$(COMPOSE) up

down: ## Stop everything
	$(COMPOSE) down

build: .env ## Rebuild the API image, after a Gemfile change
	$(COMPOSE) build

test: .env ## Run the API test suite
	$(RUN_TEST) bash -c "bin/rails db:prepare && bundle exec rspec"

lint: .env ## Run RuboCop
	$(RUN_API) bin/rubocop

migrate: .env ## Run pending migrations
	$(RUN_API) bin/rails db:migrate

console: .env ## Open a Rails console
	$(RUN_API) bin/rails console

shell: .env ## Open a shell in the API container
	$(RUN_API) bash

clean: ## Stop everything and discard the database volume
	$(COMPOSE) down --volumes
