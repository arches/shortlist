Rails.application.routes.draw do
  namespace :api do
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
end
