import { useState } from "react";

import { ApiError } from "@/api/client";
import type { PlaceSuggestion, Restaurant } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { PlaceSearch } from "./PlaceSearch";
import { useAddRestaurant } from "./queries";

interface AddRestaurantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // list-screen.states.md has an Add a restaurant row that moves five of the
  // screen's six regions, and none of them is this dialog's. So the add is
  // reported rather than answered here: the dialog knows which restaurant went
  // on the list, and the page knows what the screen does about it.
  onAdded: (restaurant: Restaurant) => void;
}

// managing-my-list.wireframe.drawio: a dialog headed "Add a restaurant", with
// the name field and the Google Places suggestions under it, a "Note" field
// under those, and "Add to list" and "Cancel" at the foot. Its own annotation:
// "Note is optional, and editable on the restaurant detail later".
//
// So picking a suggestion is no longer the add. The wireframe draws a button
// for that, which is what gives the owner a moment between choosing the
// restaurant and committing to it — the moment the note is written in.
//
// "Add to list" sits before "Cancel" and the pair is left-aligned, which is
// where this wireframe draws them. The experiences dialogs put Cancel first
// and the pair on the right; two artifacts draw two things, and each screen
// follows the one that draws it.
export function AddRestaurantDialog({ open, onOpenChange, onAdded }: AddRestaurantDialogProps) {
  const add = useAddRestaurant();
  const [picked, setPicked] = useState<PlaceSuggestion | undefined>();
  const [note, setNote] = useState("");

  // "Then it is rejected as already on my list." The owner is told, and is not
  // shown the restaurant already there.
  const messages =
    add.error instanceof ApiError
      ? Object.values(add.error.attributeErrors).flat()
      : add.error
        ? [add.error.message]
        : [];

  function addToList() {
    if (picked === undefined) return;

    // An emptied field is sent as null, the same way the experience form says
    // it. The API trims and stores blank as absent either way; sending null is
    // what makes "I wrote no note" the thing the request says, rather than
    // leaving the column to work it out from an empty string.
    add.mutate(
      { googlePlaceId: picked.google_place_id, note: note.trim().length > 0 ? note.trim() : null },
      {
        // managing-my-list.adding-a-restaurant.sequence.d2: "201 — the
        // Restaurant with address and cuisine, and the List item's note". That
        // response is what names the restaurant now on the list, and it is
        // handed on rather than discarded.
        onSuccess: (added) => {
          reset();
          onAdded(added);
        },
      },
    );
  }

  function reset() {
    add.reset();
    setPicked(undefined);
    setNote("");
  }

  function close() {
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a restaurant</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <PlaceSearch onPick={setPicked} disabled={add.isPending} />

          {/*
            Optional, and nothing turns an empty one away: the restaurant is
            what the owner came to add, and the note is why they bothered. The
            wireframe draws no "optional" beside the label the way the
            experience form's three fields carry one, so neither does this.
          */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Note</Label>

            <Textarea
              id="note"
              name="note"
              placeholder="Why is it on your list?"
              value={note}
              disabled={add.isPending}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          {messages.map((message) => (
            <p key={message} role="alert" className="text-destructive text-sm">
              {message}
            </p>
          ))}

          <div className="flex gap-2">
            {/*
              Nothing to add until a suggestion is picked. The Place ID is the
              whole of what Shortlist is told about a restaurant, so there is no
              add to make without one.
            */}
            <Button type="button" onClick={addToList} disabled={picked === undefined || add.isPending}>
              Add to list
            </Button>

            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
