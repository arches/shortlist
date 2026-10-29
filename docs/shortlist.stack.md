# Shortlist Technology Standards

One row per kind of choice Shortlist makes, and the one thing that fills it. A second answer appearing in any category is a conflict, not an addition.

This is not the dependency list. Nothing here arrived as a dependency of something else — Base UI, `puma`, `pg` and the rest are consequences of the choices below, and the manifests are where they belong. Version columns are filled only where the number is load-bearing.

## Frontend

| Category                       | Selection       | Version | Decision                                     |
| ------------------------------ | --------------- | ------- | -------------------------------------------- |
| Language                       | TypeScript      |         |                                              |
| UI framework                   | React           | 19      |                                              |
| Build tool and dev server      | Vite            |         |                                              |
| Routing                        | TanStack Router |         | Code-based route definitions, not file-based |
| Server state and data fetching | TanStack Query  |         |                                              |
| UI components                  | shadcn/ui       |         |                                              |
| Styling                        | Tailwind CSS    | 4       |                                              |
| Linting                        | oxlint          |         |                                              |
| Unit and component tests       | vitest          |         |                                              |
| Package manager                | pnpm            |         |                                              |
| Maps                           | Google Maps API |         | Via @vis.gl/react-google-maps                |

## Backend

| Category                  | Selection                | Version | Decision                                                                                         |
| ------------------------- | ------------------------ | ------- | ------------------------------------------------------------------------------------------------ |
| Language                  | Ruby                     | 3.4     |                                                                                                  |
| API framework             | Rails                    | 8       | API-only (`config.api_only = true`): JSON only, no server-rendered views                         |
| Database access           | Active Record            |         |                                                                                                  |
| Schema migrations         | Active Record migrations |         | `db/migrate`, with `db/schema.rb` checked in as the result                                       |
| JSON serialization        | `render json:`           |         | No serializer library. Where a response differs from the row, an `as_json` override on the model |
| Authentication            | Hand-rolled JWT          |         | Issued and verified by the API itself. There is no identity provider                             |
| Password hashing          | bcrypt                   |         | Through `has_secure_password`. Shortlist stores the digest and never the password                |
| Token signing             | HS256                    |         | The `jwt` gem, keyed on `SECRET_KEY_BASE`. One service both signs and verifies, so no public key |
| Linting                   | RuboCop                  |         | `rubocop-rails-omakase`, taken as it ships                                                       |
| Package manager           | Bundler                  |         |                                                                                                  |
| Configuration and secrets | Environment variables    |         | Read through `ENV.fetch`. Rails encrypted credentials are not used — see **Naming** below        |
| HTTP Client               | Net::HTTP                |         |                                                                                                  |

## Backend - Testing

| Category      | Selection   | Version | Decision                    |
| ------------- | ----------- | ------- | --------------------------- |
| Tests         | RSpec       |         | `rspec-rails`               |
| Test data     | factory_bot |         | Rails fixtures are not used |
| HTTP Stubbing | Webmock     |         |                             |

### Naming

An environment variable keeps the name Rails or a library already reads it under: `DATABASE_URL`, `SECRET_KEY_BASE`, `RAILS_ENV`. Anything Shortlist invents for itself takes a `SHORTLIST_` prefix, so the two kinds are told apart by sight.

## Platform

| Category                      | Selection         | Version | Decision                                                                                                               |
| ----------------------------- | ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| Relational database           | PostgreSQL        | 18      |                                                                                                                        |
| API hosting                   | Fly.io            |         | Always-on, for first-request latency                                                                                   |
| Frontend hosting              | S3                |         | Static assets                                                                                                          |
| Local development environment | Docker Compose    |         | Runs the API, the frontend dev server and Postgres, so nothing is external                                             |
| Task runner                   | Make              |         |                                                                                                                        |
| Restaurant Details            | Google Places API | (New)   | Autocomplete (New) and Place Details (New). Called by the API, never the browser; the key is server-side configuration |

## Categories with no answer yet

Each of these is a real slot, left empty rather than unnamed, because an empty slot is what stops a generator picking for us.

| Category                  | Status |
| ------------------------- | ------ |
| Database hosting          | TBD    |
| Transactional email       | TBD    |
| End-to-end tests          | TBD    |
| CI                        | TBD    |
| Logging and observability | TBD    |
| Error tracking            | TBD    |
| Background work           | TBD    |

**Database hosting** and **Transactional email** are newly empty rather than newly noticed. Locally Postgres comes out of Docker Compose, so nothing needs answering to develop; where it lives in production is undecided. Nothing in Shortlist mails anybody at all today — recovery is out of scope in `signing-in.scenarios.md` — so the email slot is unanswered rather than unneeded, and a recovery link is the thing that will fill it.

<!-- alloy: technology-standards -->
