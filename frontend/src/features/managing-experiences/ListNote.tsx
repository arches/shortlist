import { useState } from "react";

import { ApiError } from "@/api/client";
import type { Restaurant } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { useSetTheNote } from "@/features/managing-my-list/queries";

// managing-experiences.wireframe.drawio puts a "LIST NOTE" block on the
// restaurant's own screen, holding the note and an "Edit" beside it, with two
// annotations: "From my list, not an experience note" and "Reads Add a note
// when empty".
//
// So this is where a note is changed, and the Add dialog's own annotation
// agrees: "Note is optional, and editable on the restaurant detail later".
//
// It lives in this feature because this is the wireframe that draws it, the
// way subtitle.ts does — but what it changes belongs to the list, which is why
// the mutation comes from there.
//
// Edit replaces the note in place rather than opening a dialog. Every other
// edit on this screen is a dialog and each of those is drawn as one; this is
// not — see ASSUMPTIONS.md, "What the restaurant screen's Edit opens for a
// note".
export function ListNote({ restaurant }: { restaurant: Restaurant }) {
  const setTheNote = useSetTheNote();
  const [editing, setEditing] = useState(false);
  const [typed, setTyped] = useState("");

  const messages =
    setTheNote.error instanceof ApiError
      ? Object.values(setTheNote.error.attributeErrors).flat()
      : setTheNote.error
        ? [setTheNote.error.message]
        : [];

  function edit() {
    setTyped(restaurant.note ?? "");
    setTheNote.reset();
    setEditing(true);
  }

  function cancel() {
    setTheNote.reset();
    setEditing(false);
  }

  // An emptied field is sent as null, the way every other form here says
  // "clear this". Clearing a note is emptying it — there is no separate act of
  // deleting one — so Save is live on an empty field rather than disabled.
  function save() {
    setTheNote.mutate(
      { id: restaurant.id, note: typed.trim().length > 0 ? typed.trim() : null },
      { onSuccess: () => setEditing(false) },
    );
  }

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="text-muted-foreground text-xs tracking-wider uppercase">List note</h2>

        {/*
          The wireframe draws this "Edit" and an "Edit" on every experience row
          below it, so the label alone does not say which. The visible text
          stays what is drawn and the accessible name says which one it is —
          otherwise the screen offers four controls called Edit and nothing but
          position tells them apart.
        */}
        {!editing && (
          <Button variant="ghost" size="sm" aria-label="Edit list note" onClick={edit}>
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            id="list-note"
            name="list-note"
            aria-label="List note"
            placeholder="Why is it on your list?"
            value={typed}
            disabled={setTheNote.isPending}
            onChange={(event) => setTyped(event.target.value)}
          />

          {messages.map((message) => (
            <p key={message} role="alert" className="text-destructive text-sm">
              {message}
            </p>
          ))}

          <div className="flex gap-2">
            <Button type="button" onClick={save} disabled={setTheNote.isPending}>
              Save
            </Button>

            <Button type="button" variant="outline" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        // "Reads Add a note when empty." The prompt is what the owner presses
        // Edit after reading, so it sits where the note would be rather than
        // replacing the Edit control.
        <p className={restaurant.note === null ? "text-muted-foreground text-sm" : "text-sm"}>
          {restaurant.note ?? "Add a note"}
        </p>
      )}
    </section>
  );
}
