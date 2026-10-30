Rails.application.routes.draw do
  # shortlist.deployment.md: every fly.<env>.toml carries a health check, and Fly
  # stops sending traffic to a machine that fails one. Rails' own health
  # controller is the whole answer — it reports that the process is up, which is
  # all the proxy asks. Outside the api namespace: this is the platform's
  # endpoint, not one the frontend ever calls.
  get Shortlist::HEALTH_CHECK_PATH, to: "rails/health#show", as: :health_check

  namespace :api do
    # shortlist.principles.md: what the frontend cannot infer, the API serves,
    # unauthenticated, because the frontend needs it before anybody has signed
    # in. One value today — the Google Maps browser key — and a singular
    # resource because there is one configuration rather than a collection.
    # The controller keeps the singular name the thing has: there is one
    # configuration, not a collection of them, so the route says which
    # controller rather than letting the pluralization pick a wrong one.
    resource :configuration, only: [ :show ], controller: "configuration"

    # A Session is not an entity — see shortlist.glossary.md. What this creates
    # is a token pair; what destroys it is signing out.
    resource :session, only: [ :create, :destroy ] do
      # Renewal rotates the pair. A Session outlives any one access token
      # issued within it.
      post :renewal, to: "session_renewals#create"
    end

    # managing-my-list.adding-a-restaurant.sequence.d2: the browser asks
    # Shortlist for suggestions and Shortlist asks Google. Not nested under the
    # list — a suggestion is a Google Place that may be on nobody's list.
    namespace :places do
      resources :suggestions, only: [ :index ]
    end

    # managing-my-list.adding-a-restaurant.sequence.d2 names the list's own
    # collection: POST /list/restaurants { google_place_id }. An owner has
    # exactly one List, so nothing identifies it in the path.
    #
    # A scope rather than a namespace, for two reasons: the controller is the
    # same one, and an Api::List:: module would shadow the List model for every
    # constant lookup inside it.
    scope :list, as: :list do
      resources :restaurants, only: [ :index, :create, :destroy ]
    end

    # A Restaurant itself, and the experiences at it. Not under the list: an
    # Experience is the owner's and the Restaurant's, and it outlives the List
    # item that used to put them in reach of each other.
    #
    # managing-experiences.wireframe.drawio.svg settles where experiences live:
    # the restaurant's own screen. An Experience has no name and so cannot be
    # picked out by one — the only handle on it is the Restaurant it happened
    # at, which is what nests it here.
    resources :restaurants, only: [] do
      resources :experiences, only: [ :index, :create, :update, :destroy ]
    end
  end

  # shortlist.deployment.md: the app machine serves the built frontend as well as
  # the API, so a path the API does not claim is the frontend's. Its routes are
  # real URLs — a signed-out owner is redirected to /sign-in, and a restaurant's
  # own screen is /restaurants/:id — and a reload on one of those has to reach
  # the document that boots the router rather than a 404.
  #
  # Two prefixes are not the frontend's and are excluded rather than caught: /api
  # is the JSON API, where an unclaimed path is a 404 and must say so in JSON,
  # and /assets holds the digest-stamped build output the static middleware
  # serves, where a missing file is a missing file.
  get "*path",
      to: "frontend#show",
      format: false,
      constraints: ->(request) { !request.path.start_with?("/api", "/assets") }

  root to: "frontend#show"
end
