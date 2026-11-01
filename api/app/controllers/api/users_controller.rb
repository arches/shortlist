module Api
  # signing-in.scenarios.md: "Signing up". An account is created by whoever
  # wants one — the administrator who used to create them by hand is gone from
  # the artifact, and so is the premise that Shortlist has to hand anything
  # over.
  #
  # A User is an entity, unlike a Session, so this is the ordinary create of
  # one. What it answers with is the token pair, because "I am not asked to
  # sign in": the account and the session that follows it are one act rather
  # than two. See ASSUMPTIONS.md, "How signing up reaches the API".
  class UsersController < ApplicationController
    include IssuesSessions

    def create
      owner = User.new(details)

      # "And the password on that account still works." Nothing here reaches an
      # existing row, so a collision cannot touch one: the uniqueness
      # validation refuses, and the account it collided with is never read, let
      # alone written. A sign-up that reset the password of the account it
      # collided with would be a way to take somebody's list from them knowing
      # only their address.
      #
      # Both refusals the scenarios name come out of here. "I am told that
      # address already has an account" is the uniqueness message on User, and
      # "I am told what to fix" is every other validation — one shape, because
      # the thing the owner does about either is retype a field.
      return render_invalid(owner) unless owner.save

      # "Then my list opens. And it is called \"My List\". And nothing is on
      # it." The List is created with the User, per shortlist.data.md's
      # invariant, so there is no moment at which a new owner has no list.
      render json: issued_session(owner), status: :created
    end

    private
      # shortlist.data.md: a User is their email, their password and their name.
      # Nothing else on the row is the owner's to set, so nothing else is read.
      #
      # Flat rather than nested, matching the sign-in form next to it: both send
      # credentials, and neither is a record the owner holds a copy of.
      def details
        {
          email: params[:email].to_s,
          password: params[:password].to_s,
          name: params[:name].to_s
        }
      end
  end
end
