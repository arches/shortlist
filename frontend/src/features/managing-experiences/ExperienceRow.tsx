import type { Experience } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { Stars } from "./Stars";
import { formatDay, formatInstant } from "./dates";

// managing-experiences.wireframe.drawio.svg draws one row per experience: the
// stars and the number, the day it happened on the right, and the note beneath.
// Each of the three optional attributes has its own absent-marker, because an
// experience carrying only one of them is the ordinary case rather than a
// degenerate one — "No date" with the day it was written down instead, and
// "No notes".
interface ExperienceRowProps {
  experience: Experience;
  onEdit: (experience: Experience) => void;
  onRemove: (experience: Experience) => void;
}

export function ExperienceRow({ experience, onEdit, onRemove }: ExperienceRowProps) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-4">
        <Stars rating={experience.rating} />

        <div className="text-muted-foreground shrink-0 text-right text-sm">
          {experience.occurred_on === null ? (
            <>
              <p>No date</p>
              {/*
                An experience with no date still has a day it was written down,
                and recorded_at is not necessarily when it happened — so this is
                offered as what it is rather than standing in for the date.
              */}
              <p className="text-xs">recorded {formatInstant(experience.recorded_at)}</p>
            </>
          ) : (
            <p>{formatDay(experience.occurred_on)}</p>
          )}
        </div>
      </div>

      <p className={experience.notes === null ? "text-muted-foreground text-sm" : "text-sm"}>
        {experience.notes ?? "No notes"}
      </p>

      {/*
        The wireframe puts "Edit · Remove" at the foot of each row. An
        experience has no name, so these are the only handle on one — which is
        why they sit on the row rather than anywhere a name could be typed.
      */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(experience)}>
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => onRemove(experience)}>
          Remove
        </Button>
      </div>
    </Card>
  );
}
