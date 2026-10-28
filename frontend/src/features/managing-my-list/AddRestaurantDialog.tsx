import { ApiError } from "@/api/client";
import type { RestaurantDraft } from "@/api/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ADD_FIELDS, RestaurantForm } from "./RestaurantForm";
import { useAddRestaurant } from "./queries";

interface AddRestaurantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// managing-my-list.wireframe.drawio.svg: a dialog headed "Add a restaurant",
// with Add and Cancel.
export function AddRestaurantDialog({ open, onOpenChange }: AddRestaurantDialogProps) {
  const add = useAddRestaurant();

  // A name collision is rejected and nothing more: the owner is told, and is not
  // shown the restaurant already there. The TBD in the artifact asks which, and
  // being told is the narrower reading.
  const attributeErrors = add.error instanceof ApiError ? add.error.attributeErrors : {};

  function submit(draft: RestaurantDraft) {
    add.mutate(draft, {
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

        <RestaurantForm
          fields={ADD_FIELDS}
          submitLabel="Add"
          attributeErrors={attributeErrors}
          pending={add.isPending}
          onSubmit={submit}
          onCancel={close}
        />
      </DialogContent>
    </Dialog>
  );
}
