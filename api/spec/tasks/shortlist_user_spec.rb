require "rails_helper"
require "rake"

# shortlist.data.md: an administrator creates a User by hand, with a name, an
# email and a password. This task is the whole of that act — there is no
# sign-up flow that could create one half-finished.
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

  it "refuses an account it cannot create, and says why" do
    expect { task.invoke("sam.reed@fastmail.com", "Sam Reed", "hunter2") }
      .to raise_error(SystemExit, /minimum is 8 characters/)

    expect(User.count).to eq(0)
  end
end
