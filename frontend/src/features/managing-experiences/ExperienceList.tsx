import { useState } from "react";

import type { Experience } from "@/api/types";
import { SessionEnded } from "@/session/session";

import { ChangeExperienceDialog } from "./ChangeExperienceDialog";
import { ExperienceRow } from "./ExperienceRow";
import { RemoveExperienceDialog } from "./RemoveExperienceDialog";
import { useExperiences } from "./queries";

// managing-experiences.wireframe.drawio.svg heads the section "EXPERIENCES" and
// lists one row beneath it. The heading is written in sentence case and
// uppercased in the styling, so a screen reader hears a word rather than
// spelling one out.
//
// The order is the API's and nothing here re-sorts it: most recent first by the
// day it happened, undated at the end, a tie on one day broken by which was
// written down later.
export function ExperienceList({ restaurantId }: { restaurantId: number }) {
  const { data: experiences, isPending, error } = useExperiences(restaurantId);
  const [editing, setEditing] = useState<Experience | undefined>();
  const [removing, setRemoving] = useState<Experience | undefined>();

  return (
    <section>
      <h2 className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
        Experiences
      </h2>

      {isPending && <p className="text-muted-foreground text-sm">Reading your experiences…</p>}

      {/*
        A session that has actually ended is the restaurant screen's business,
        which sends the owner to sign in. Showing "Sign in to continue." here as
        well would say it twice on the way out.
      */}
      {error && !(error instanceof SessionEnded) && (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}

      <ChangeExperienceDialog
        restaurantId={restaurantId}
        experience={editing}
        onClose={() => setEditing(undefined)}
      />

      <RemoveExperienceDialog
        restaurantId={restaurantId}
        experience={removing}
        onClose={() => setRemoving(undefined)}
      />

      {experiences && experiences.length === 0 && (
        <p className="text-muted-foreground text-sm">No experiences here yet.</p>
      )}

      {experiences && experiences.length > 0 && (
        <ul className="flex flex-col gap-3">
          {experiences.map((experience) => (
            <li key={experience.id}>
              <ExperienceRow
                experience={experience}
                onEdit={setEditing}
                onRemove={setRemoving}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
