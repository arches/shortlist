import type { Restaurant } from "@/api/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useTakeRestaurantOffTheList } from "./queries";

interface TakeOffListDialogProps {
  restaurant: Restaurant | undefined;
  onClose: () => void;
}

// managing-my-list.wireframe.drawio.svg draws this confirmation and its words:
//
//   Take "Joe's Pizza" off my list?
//   Your 2 experiences are kept, but you will not be able to reach them again.
//   [Take it off] [Cancel]
//
// The second line is the honest one. Removed buys retention, not recovery: the
// experiences survive and nothing reads them back. Saying "deleted" would be
// wrong, and saying nothing would let an owner think tidying their list had
// destroyed years of their own notes.
export function experienceWarningFor(restaurant: Restaurant): string | undefined {
  if (restaurant.experience_count === 0) return undefined;

  const experiences =
    restaurant.experience_count === 1
      ? "Your 1 experience is kept"
      : `Your ${restaurant.experience_count} experiences are kept`;

  return `${experiences}, but you will not be able to reach them again.`;
}

export function TakeOffListDialog({ restaurant, onClose }: TakeOffListDialogProps) {
  const takeOff = useTakeRestaurantOffTheList();

  function confirm() {
    if (!restaurant) return;

    takeOff.mutate(restaurant.id, {
      onSuccess: () => {
        takeOff.reset();
        onClose();
      },
    });
  }

  function close() {
    takeOff.reset();
    onClose();
  }

  const warning = restaurant ? experienceWarningFor(restaurant) : undefined;

  return (
    <AlertDialog open={restaurant !== undefined} onOpenChange={(next) => !next && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Take “{restaurant?.name}” off my list?</AlertDialogTitle>

          {warning !== undefined && (
            <AlertDialogDescription>{warning}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {takeOff.error && (
          <p role="alert" className="text-destructive text-sm">
            {takeOff.error.message}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={close}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={takeOff.isPending} onClick={confirm}>
            Take it off
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
