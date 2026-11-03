class ListItemsCarryANote < ActiveRecord::Migration[8.1]
  def change
    # shortlist.data.md's List item attribute table: "long text, trimmed",
    # optional. Text rather than a bounded string, and no length constraint —
    # the table bounds its short text at 255 and bounds this at nothing, so a
    # limit here would be one this artifact did not ask for. See ASSUMPTIONS.md,
    # "How long a note may be".
    #
    # Nullable, which is also what makes it safe to add while the previous
    # machines serve: shortlist.deployment.md runs migrations from
    # release_command before new machines take traffic, so the running code has
    # to tolerate the column arriving, and code that never names it does.
    add_column :list_items, :note, :text
  end
end
