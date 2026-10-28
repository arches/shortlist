Rails.application.routes.draw do
  namespace :api do
    # A Session is not an entity — see shortlist.glossary.md. What this creates
    # is a token pair; what destroys it is signing out.
    resource :session, only: [ :create ]
  end
end
