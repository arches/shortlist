import { useState } from "react";

import { ApiError } from "@/api/client";
import type { PlaceSuggestion } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { PlaceSearch } from "./PlaceSearch";
import { useAddRestaurant } from "./queries";

interface AddRestaurantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// managing-my-list.wireframe.drawio: a dialog headed "Add a restaurant", with
// the name field and the Google Places suggestions under it, and "Add to list"
// and "Cancel" at the foot.
//
// So picking a suggestion is no longer the add. The wireframe draws a button
// for that, which is what gives the owner a moment between choosing the
// restaurant and committing to it — the moment the note is written in.
//
// "Add to list" sits before "Cancel" and the pair is left-aligned, which is
// where this wireframe draws them. The experiences dialogs put Cancel first
// and the pair on the right; two artifacts draw two things, and each screen
// follows the one that draws it.
export function AddRestaurantDialog({ open, onOpenChange }: AddRestaurantDialogProps) {
  const add = useAddRestaurant();
  const [picked, setPicked] = useState<PlaceSuggestion | undefined>();

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

    add.mutate(picked.google_place_id, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  }

  function reset() {
    add.reset();
    setPicked(undefined);
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
