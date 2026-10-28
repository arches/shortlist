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
// one field and the Google Places suggestions under it. There is no Add button
// — picking a suggestion is the add, because the Place ID is the whole of what
// Shortlist is told.
export function AddRestaurantDialog({ open, onOpenChange }: AddRestaurantDialogProps) {
  const add = useAddRestaurant();

  // "Then it is rejected as already on my list." The owner is told, and is not
  // shown the restaurant already there.
  const messages =
    add.error instanceof ApiError
      ? Object.values(add.error.attributeErrors).flat()
      : add.error
        ? [add.error.message]
        : [];

  function pick(suggestion: PlaceSuggestion) {
    add.mutate(suggestion.google_place_id, {
      onSuccess: () => {
        add.reset();
        onOpenChange(false);
      },
    });
  }

  function close() {
    add.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a restaurant</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <PlaceSearch onPick={pick} disabled={add.isPending} />

          {messages.map((message) => (
            <p key={message} role="alert" className="text-destructive text-sm">
              {message}
            </p>
          ))}

          <div className="flex justify-end">
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
