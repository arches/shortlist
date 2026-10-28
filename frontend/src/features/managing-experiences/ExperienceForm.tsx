import { useState, type FormEvent } from "react";

import type { Experience, ExperienceDraft } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { RatingInput } from "./RatingInput";

export interface ExperienceFormProps {
  experience?: Experience | undefined;
  submitLabel: string;
  attributeErrors?: Record<string, string[]>;
  pending?: boolean;
  onSubmit: (draft: ExperienceDraft) => void;
  onCancel: () => void;
}

// managing-experiences.wireframe.drawio.svg draws three fields, each labelled
// optional: RATING, WHEN and NOTES. "At least one of the three. Save stays
// disabled while all three are empty."
//
// That is the one rule that makes the others safe to leave optional, and it is
// enforced on both sides: here so the owner is not invited to submit nothing,
// and by the API because clearing the last thing an experience says is
// reachable in two steps.
export function saysSomething(draft: ExperienceDraft): boolean {
  return (
    draft.rating !== null ||
    (draft.notes !== null && draft.notes !== undefined) ||
    (draft.occurred_on !== null && draft.occurred_on !== undefined)
  );
}

export function ExperienceForm({
  experience,
  submitLabel,
  attributeErrors = {},
  pending = false,
  onSubmit,
  onCancel,
}: ExperienceFormProps) {
  const [rating, setRating] = useState<number | null>(experience?.rating ?? null);
  const [occurredOn, setOccurredOn] = useState(experience?.occurred_on ?? "");
  const [notes, setNotes] = useState(experience?.notes ?? "");

  // An emptied field is sent as null, which is how the API hears "clear this" —
  // the same way the restaurant form says it. Clearing is a distinct act from
  // leaving a field alone, and both have to be sayable.
  const draft: ExperienceDraft = {
    rating,
    occurred_on: occurredOn.length > 0 ? occurredOn : null,
    notes: notes.trim().length > 0 ? notes.trim() : null,
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(draft);
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <div className="flex flex-col gap-2">
        <Label className="text-muted-foreground text-xs tracking-wider uppercase">
          Rating <span className="normal-case">optional</span>
        </Label>

        <RatingInput value={rating} onChange={setRating} />

        <p className="text-muted-foreground text-xs">
          Click the left half of a star for a half star. Clear leaves it with no rating at all.
        </p>

        {attributeErrors.rating?.map((message) => (
          <p key={message} role="alert" className="text-destructive text-sm">
            {message}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="occurred_on"
          className="text-muted-foreground text-xs tracking-wider uppercase"
        >
          When <span className="normal-case">optional</span>
        </Label>

        {/*
          The wireframe draws a picker. shortlist.stack.md names shadcn/ui as
          the only source of components and no calendar is installed, so this is
          the browser's own date input — which gives a picker, adds no
          dependency, and cannot express a day that is not a day.
        */}
        <Input
          id="occurred_on"
          name="occurred_on"
          type="date"
          value={occurredOn}
          onChange={(event) => setOccurredOn(event.target.value)}
        />

        <p className="text-muted-foreground text-xs">Leave empty if you can’t remember.</p>

        {attributeErrors.occurred_on?.map((message) => (
          <p key={message} role="alert" className="text-destructive text-sm">
            {message}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes" className="text-muted-foreground text-xs tracking-wider uppercase">
          Notes <span className="normal-case">optional</span>
        </Label>

        <Textarea
          id="notes"
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        {attributeErrors.notes?.map((message) => (
          <p key={message} role="alert" className="text-destructive text-sm">
            {message}
          </p>
        ))}
      </div>

      <p className="text-muted-foreground text-xs">At least one of the three.</p>

      {attributeErrors.base?.map((message) => (
        <p key={message} role="alert" className="text-destructive text-sm">
          {message}
        </p>
      ))}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>

        {/* Save stays disabled while all three are empty. */}
        <Button type="submit" disabled={pending || !saysSomething(draft)}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
