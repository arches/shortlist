# Development image. shortlist.stack.md names Docker Compose as the local
# development environment, so this is what Compose builds and what every local
# command runs in. The production image is the Dockerfile at the repository root,
# which builds both halves of Shortlist into the one image Fly.io runs.
FROM ruby:3.4.12-slim

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      build-essential \
      git \
      libpq-dev \
      libyaml-dev \
      postgresql-client && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_JOBS="4"

COPY Gemfile Gemfile.lock ./
RUN bundle install && rm -rf "${BUNDLE_PATH}"/cache

COPY . .

EXPOSE 3000

CMD ["bin/rails", "server", "-b", "0.0.0.0"]
