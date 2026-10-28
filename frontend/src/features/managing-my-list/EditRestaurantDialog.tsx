import { ApiError } from "@/api/client";
import type { Restaurant, RestaurantDraft } from "@/api/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ALL_FIELDS, RestaurantForm } from "./RestaurantForm";
import { useChangeRestaurant } from "./queries";

interface EditRestaurantDialogProps {
  restaurant: Restaurant | undefined;
  onClose: () => void;
}

// managing-my-list.wireframe.drawio.svg: a dialog headed "Edit · <name>", with
// Save and Cancel, and a clear affordance on the filled fields.
export function EditRestaurantDialog({ restaurant, onClose }: EditRestaurantDialogProps) {
  const change = useChangeRestaurant();

  const attributeErrors = change.error instanceof ApiError ? change.error.attributeErrors : {};

  function submit(draft: RestaurantDraft) {
    if (!restaurant) return;

    change.mutate(
      { id: restaurant.id, draft },
      {
        onSuccess: () => {
          change.reset();
          onClose();
        },
      },
    );
  }

  function close() {
    change.reset();
    onClose();
  }

  return (
    <Dialog open={restaurant !== undefined} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit · {restaurant?.name}</DialogTitle>
        </DialogHeader>

        {restaurant && (
          // Keyed on the restaurant, so opening a different one starts from its
          // own values rather than the previous one's.
          <RestaurantForm
            key={restaurant.id}
            fields={ALL_FIELDS}
            restaurant={restaurant}
            submitLabel="Save"
            attributeErrors={attributeErrors}
            pending={change.isPending}
            onSubmit={submit}
            onCancel={close}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
