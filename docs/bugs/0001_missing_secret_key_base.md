# Description

Many backend specs are failing because of a missing variable SECRET_KEY_BASE in the Github CI environment.

# Repro

1. Run rspec in Github

# Expected

Tests pass

# Actual

347 examples, 131 failures

Failures:

  1) GET /api/configuration answers the same once I am signed in
     Failure/Error: ENV.fetch("SECRET_KEY_BASE")

     KeyError:
       key not found: "SECRET_KEY_BASE"
     # ./app/models/access_token.rb:35:in 'fetch'
     # ./app/models/access_token.rb:35:in 'AccessToken.secret'
     # ./app/models/access_token.rb:18:in 'AccessToken.issue'
     # ./spec/support/sign_in_helpers.rb:9:in 'SignInHelpers#headers_for'
     # ./spec/requests/api/configuration_spec.rb:48:in 'block (2 levels) in <main>'

...etc

