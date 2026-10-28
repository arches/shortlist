Rails.application.routes.draw do
  namespace :api do
    # A Session is not an entity — see shortlist.glossary.md. What this creates
    # is a token pair; what destroys it is signing out.
    resource :session, only: [ :create, :destroy ] do
      # Renewal rotates the pair. A Session outlives any one access token
      # issued within it.
      post :renewal, to: "session_renewals#create"
    end

    # There is no /list: a List is not an entity and an owner has exactly one.
    resources :restaurants, only: [ :index, :create ]
  end
end
