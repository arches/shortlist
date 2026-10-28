import { ApiError } from "@/api/client";
import type { Experience, ExperienceDraft } from "@/api/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ExperienceForm } from "./ExperienceForm";
import { useChangeExperience } from "./queries";

interface ChangeExperienceDialogProps {
  restaurantId: number;
  experience: Experience | undefined;
  onClose: () => void;
}

// An edit overwrites. There is no history of the history, so a corrected rating
// leaves no trace of what it used to be — nothing here shows an earlier version
// because nothing keeps one.
//
// The wireframe draws the row's Edit control but not the dialog behind it, so
// this follows the recording dialog's shape. It needs no heading naming the
// experience the way the removal confirmation does: the form is filled with
// that experience's own values, which is what says which one it is.
export function ChangeExperienceDialog({
  restaurantId,
  experience,
  onClose,
}: ChangeExperienceDialogProps) {
  const change = useChangeExperience(restaurantId);

  // The emptiness rule holds on a change as well as on a recording, and the
  // form will not offer a submit that breaks it — but an experience can be
  // emptied in ways the form cannot see, so the API's refusal is shown.
  const attributeErrors = change.error instanceof ApiError ? change.error.attributeErrors : {};

  function submit(draft: ExperienceDraft) {
    if (!experience) return;

    change.mutate(
      { id: experience.id, draft },
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
    <Dialog open={experience !== undefined} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit an experience</DialogTitle>
        </DialogHeader>

        {/*
          Keyed on the experience, so opening the dialog for a different one
          starts the form from that one's values rather than keeping the last.
        */}
        {experience && (
          <ExperienceForm
            key={experience.id}
            experience={experience}
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
