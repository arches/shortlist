require "rails_helper"

# shortlist.deployment.md: the app machine serves the JSON API and the built
# frontend from the same image, on one origin. So the API answers for the paths
# it claims, and the frontend's own routes — which are real URLs a browser can be
# reloaded on — answer with the document that boots the bundle.
RSpec.describe "The built frontend" do
  # Stood in for rather than built: the document is produced by the image, out of
  # the frontend build, and no test run produces one. What the examples check is
  # what the app does with it, which does not depend on its contents.
  let(:document) { Rails.root.join("spec/fixtures/frontend/index.html") }

  before { stub_const("FrontendController::DOCUMENT", document) }

  def body_is_the_document
    expect(response.body).to include(%(<div id="root"></div>))
  end

  # Every path the router in frontend/src/app/router.tsx defines. Two of them are
  # reached by redirect — signing-in.scenarios.md sends a signed-out owner to
  # /sign-in, and managing-experiences puts experiences on the restaurant's own
  # screen — so both are addresses an owner can arrive at cold.
  [ "/", "/sign-in", "/restaurants/5" ].each do |path|
    it "answers #{path} with the document that boots the bundle" do
      get path

      expect(response).to have_http_status(:ok)
      body_is_the_document
    end
  end

  # The one file the build produces whose name never changes. Production serves
  # public/ with a year of cache-control, which is right for the digest-stamped
  # assets and would mean nobody ever saw a deploy if it applied here.
  it "lets nothing cache the document" do
    get "/"

    expect(response.headers["cache-control"]).to eq("no-store")
  end

  # The development case: the document is copied in by the image build, so on a
  # machine running the dev server there is nothing to serve and the dev server
  # is serving it anyway.
  it "answers with a 404 when no document has been built" do
    stub_const("FrontendController::DOCUMENT", Rails.root.join("frontend/nothing-here.html"))

    get "/"

    expect(response).to have_http_status(:not_found)
  end

  # Both exclusions in config/routes.rb, which exist so that the fallback cannot
  # turn a miss into a 200.
  it "does not answer an unclaimed API path with the document" do
    get "/api/nothing-here", as: :json

    expect(response).to have_http_status(:not_found)
    expect(response.body).not_to include(%(<div id="root"></div>))
  end

  it "does not answer a missing asset with the document" do
    get "/assets/index-nothing-here.js"

    expect(response).to have_http_status(:not_found)
    expect(response.body).not_to include(%(<div id="root"></div>))
  end
end
