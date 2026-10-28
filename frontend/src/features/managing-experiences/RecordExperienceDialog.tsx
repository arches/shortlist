import { ApiError } from "@/api/client";
import type { ExperienceDraft, Restaurant } from "@/api/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ExperienceForm } from "./ExperienceForm";
import { useRecordExperience } from "./queries";

interface RecordExperienceDialogProps {
  restaurant: Restaurant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// managing-experiences.wireframe.drawio.svg draws this headed "Record an
// experience" with the restaurant's name beneath it — an experience has no name
// of its own, so the restaurant is what says which one is being written down.
export function RecordExperienceDialog({
  restaurant,
  open,
  onOpenChange,
}: RecordExperienceDialogProps) {
  const record = useRecordExperience(restaurant.id);

  // The API's refusals, per attribute: a rating that is not one of the nine, a
  // date in the future, and the base message for an experience with nothing in
  // it. The form will not offer the last of those, but the API says it anyway.
  const attributeErrors = record.error instanceof ApiError ? record.error.attributeErrors : {};

  function submit(draft: ExperienceDraft) {
    record.mutate(draft, {
      onSuccess: () => {
        record.reset();
        onOpenChange(false);
      },
    });
  }

  function close() {
    record.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record an experience</DialogTitle>
          <DialogDescription>{restaurant.name}</DialogDescription>
        </DialogHeader>

        <ExperienceForm
          submitLabel="Save"
          attributeErrors={attributeErrors}
          pending={record.isPending}
          onSubmit={submit}
          onCancel={close}
        />
      </DialogContent>
    </Dialog>
  );
}
