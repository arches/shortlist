# An account created without a browser. signing-in.scenarios.md's "Signing up"
# is how an owner gets one now, and this is not a second way in: it obeys the
# same rules the sign-up path does, down to the twelve-character password, and
# it is here for seeding an environment that has nothing in it yet.
#
# See ASSUMPTIONS.md, "Whether creating an account by hand survives" — the
# artifact that used to call for this no longer says anything about it.
namespace :shortlist do
  namespace :user do
    desc "Create an account without a browser: email, name, password"
    task :create, [ :email, :name, :password ] => :environment do |_task, args|
      user = User.new(email: args[:email], name: args[:name], password: args[:password])

      if user.save
        puts "Created #{user.email} (##{user.id})."
      else
        abort "Could not create that account:\n" +
          user.errors.full_messages.map { |message| "  - #{message}" }.join("\n")
      end
    end
  end
end
