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

// managing-my-list.wireframe.drawio draws this confirmation, headed
//
//   Take "Joe's Pizza" off my list?
//
// and its second line reads "This will also remove your 2 experiences at Joe's
// Pizza". That line is not what the system does, and three artifacts say so:
// shortlist.data.md has removing a list item destroy that row and nothing
// else, its invariants leave the owner's Experiences standing, and
// managing-experiences.wireframe.drawio.svg says in as many words that taking
// a restaurant off the list keeps its experiences.
//
// So the behaviour follows the data model and the words follow the behaviour.
// The wireframe line is left as a contradiction for its owner to settle rather
// than quietly obeyed — see the run report. The same reading is why the button
// is not the wireframe's "Delete": nothing here deletes anything.
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
