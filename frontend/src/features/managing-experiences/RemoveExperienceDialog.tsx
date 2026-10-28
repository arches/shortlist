import type { Experience } from "@/api/types";
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

import { Stars } from "./Stars";
import { useRemoveExperience } from "./queries";
import { formatDay } from "./dates";

interface RemoveExperienceDialogProps {
  restaurantId: number;
  experience: Experience | undefined;
  onClose: () => void;
}

// managing-experiences.wireframe.drawio.svg: "The dialog names the experience,
// which is the only way to tell apart several recorded at the same restaurant."
// It draws that name as the note and the date — "Queue out the door · no date"
// — in lower case, unlike the row's own "No date" field marker.
export function namesOf(experience: Experience): string {
  const note = experience.notes ?? "no notes";
  const day = experience.occurred_on === null ? "no date" : formatDay(experience.occurred_on);

  return `${note} · ${day}`;
}

// "Confirmed first. The experience is destroyed, not kept."
//
// Taking a restaurant off the list is confirmed too, but that keeps its
// experiences — this destroys the note outright, which is why the words here
// are "This cannot be undone." and the words there are about retention.
export function RemoveExperienceDialog({
  restaurantId,
  experience,
  onClose,
}: RemoveExperienceDialogProps) {
  const remove = useRemoveExperience(restaurantId);

  function confirm() {
    if (!experience) return;

    remove.mutate(experience.id, {
      onSuccess: () => {
        remove.reset();
        onClose();
      },
    });
  }

  function close() {
    remove.reset();
    onClose();
  }

  return (
    <AlertDialog open={experience !== undefined} onOpenChange={(next) => !next && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this experience?</AlertDialogTitle>

          {experience && (
            <>
              {/*
                The rating is part of what tells two experiences apart, and the
                number beside the stars is the part of it a reader hears — the
                star strip itself is decoration. It sits beside the description
                rather than inside it, which renders a paragraph.
              */}
              <Stars rating={experience.rating} />

              <AlertDialogDescription>{namesOf(experience)}</AlertDialogDescription>
            </>
          )}
        </AlertDialogHeader>

        <p className="text-muted-foreground text-sm">This cannot be undone.</p>

        {remove.error && (
          <p role="alert" className="text-destructive text-sm">
            {remove.error.message}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={close}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={remove.isPending} onClick={confirm}>
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
