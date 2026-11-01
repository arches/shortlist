require "rails_helper"
require "rake"

# An account created without a browser, with the same name, address and
# password signing up asks for. signing-in.scenarios.md's "Signing up" is the
# way in for an owner; this is the way in for an environment that has nothing
# in it yet, and it obeys the same rules.
RSpec.describe "shortlist:user:create" do
  before(:all) do
    Rails.application.load_tasks if Rake::Task.tasks.empty?
  end

  let(:task) { Rake::Task["shortlist:user:create"] }

  after { task.reenable }

  it "creates an account with a name, an email and a password" do
    expect { task.invoke("sam.reed@fastmail.com", "Sam Reed", "correct-horse-battery-staple") }
      .to change(User, :count).by(1)

    owner = User.sole
    expect(owner.email).to eq("sam.reed@fastmail.com")
    expect(owner.name).to eq("Sam Reed")
    expect(owner.authenticate("correct-horse-battery-staple")).to eq(owner)
  end

  # The twelve-character minimum is a rule on a User, so an account created by
  # hand obeys it too — see ASSUMPTIONS.md, "How long a password has to be".
  it "refuses an account it cannot create, and says why" do
    expect { task.invoke("sam.reed@fastmail.com", "Sam Reed", "lemon") }
      .to raise_error(SystemExit, /minimum is 12 characters/)

    expect(User.count).to eq(0)
  end
end
