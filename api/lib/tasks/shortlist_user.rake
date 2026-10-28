# shortlist.data.md: a User is created by an administrator, by hand, with a name,
# an email and a password they then hand to the owner. Nothing in Shortlist
# drives that — there is no sign-up, no invitation record and no email — so this
# is the whole of it. signing-in.scenarios.md keeps "being given an account in
# the first place" out of scope for the same reason.
namespace :shortlist do
  namespace :user do
    desc "Create an account by hand: email, name, password"
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
