# syntax=docker/dockerfile:1

# The production image, per shortlist.deployment.md: one image per commit, tagged
# with the git SHA, pushed to registry.fly.io/shortlist-images and promoted from
# staging to production without being rebuilt.
#
# It is the image for both machines that run. The app machine serves the JSON API
# and the built frontend assets, and the backup machine runs bin/backup out of
# the same image — which is what pg_dump is installed for.
#
# The build context is the repository root, because the image needs both halves.
# api/Dockerfile and frontend/Dockerfile are the development images Docker
# Compose builds, and neither of them is this one.

# ---- The frontend bundle -----------------------------------------------------
# shortlist.stack.md: pnpm, and Vite as the build tool.
FROM node:24-slim AS frontend

RUN corepack enable

WORKDIR /build

# pnpm-workspace.yaml carries the one dependency allowed to run a build script.
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./

# shortlist.principles.md, "Frontend env vars are injected": nothing is injected
# here. No build argument, no environment variable, nothing interpolated into the
# bundle — what the frontend cannot infer it asks GET /api/configuration for,
# which is why this image is the same one in every environment.
RUN pnpm build

# ---- The gems ----------------------------------------------------------------
# A stage of its own, so the compilers the native extensions need are not in the
# image that runs.
FROM ruby:3.4.12-slim AS gems

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential libpq-dev libyaml-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_JOBS="4" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_WITHOUT="development test"

COPY api/Gemfile api/Gemfile.lock ./
RUN bundle install && rm -rf "${BUNDLE_PATH}"/cache

# ---- The image that runs -----------------------------------------------------
FROM ruby:3.4.12-slim

# postgresql-client is pg_dump, for the backup machine. It comes from the
# PostgreSQL project's own apt repository rather than Debian's, because
# shortlist.stack.md names PostgreSQL 18 and trixie ships client 17 — and pg_dump
# refuses to dump a server newer than itself, so the Debian package would fail
# every backup rather than produce a bad one.
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y ca-certificates curl gnupg libpq5 && \
    install -d /usr/share/postgresql-common/pgdg && \
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc && \
    echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt trixie-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list && \
    apt-get update -qq && \
    apt-get install --no-install-recommends -y postgresql-client-18 && \
    apt-get purge -y --auto-remove curl gnupg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV RAILS_ENV="production" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_WITHOUT="development test"

COPY --from=gems /usr/local/bundle /usr/local/bundle

COPY api/ ./

# The digest-stamped assets go where the static middleware serves them, with the
# year of cache-control their names are for. The document that boots them goes
# outside public/, because its name never changes and
# app/controllers/frontend_controller.rb serves it with no-store.
COPY --from=frontend /build/dist/assets ./public/assets
COPY --from=frontend /build/dist/index.html ./frontend/index.html

# Nothing runs as root. log and tmp are the only paths written at runtime, and
# .dockerignore keeps a developer's copies of both out of the image, so they are
# made here rather than copied.
RUN useradd --create-home --shell /bin/bash shortlist && \
    mkdir -p log tmp/pids && \
    chown -R shortlist:shortlist log tmp
USER shortlist

# config/puma.rb reads PORT and defaults to 3000, which is the internal_port each
# fly.<env>.toml names.
EXPOSE 3000

CMD ["bin/rails", "server", "-b", "0.0.0.0"]
