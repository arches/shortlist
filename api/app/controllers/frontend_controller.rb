# shortlist.deployment.md: the app machine serves the JSON API and the built
# frontend assets from the same image, so both halves are one origin and there is
# no CORS boundary and no second host.
#
# This serves the one document that boots the bundle. Everything else the build
# produces is digest-stamped and lands in public/, where the static middleware
# answers it with production's far-future cache-control. The document cannot live
# there with it: it is the one file whose name never changes, so a year of
# cache-control on it would be a year of nobody seeing a deploy.
#
# Nothing is interpolated into it. shortlist.principles.md keeps configuration
# out of the bundle, and what the frontend cannot infer it asks
# GET /api/configuration for, so the document is served exactly as it was built.
class FrontendController < ApplicationController
  # Copied out of the frontend build by the image, which is the only thing that
  # produces it — hence absent on a development machine, where the dev server
  # serves the document instead.
  DOCUMENT = Rails.root.join("frontend/index.html")

  # Deliberately no authenticate_owner!. The sign-in screen is in this document,
  # so refusing it to anybody without a session would refuse everybody.
  def show
    return head :not_found unless DOCUMENT.exist?

    response.headers["cache-control"] = "no-store"
    send_file DOCUMENT, type: "text/html", disposition: "inline"
  end
end
