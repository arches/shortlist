import { whatIsNarrowing } from "./narrowing";
import type { Narrowing } from "./narrowing";

interface NarrowingNoticeProps {
  by: Narrowing;
}

// Scenario: Searching within a filter ends with "And I see that both a search
// and a filter are narrowing my list". Neither the wireframe nor the scenarios
// draw it, so it is one line at the top of the sheet, where the list it
// explains is — see ASSUMPTIONS.md, "How a narrowed list says what narrowed
// it".
//
// Outside the sheet's scroll region, so it does not scroll away from the cards
// it is about, and a status so a screen reader is told when it changes: the dot
// on the hamburger is the visual half of this and says nothing out loud.
export function NarrowingNotice({ by }: NarrowingNoticeProps) {
  const notice = whatIsNarrowing(by);

  if (notice === undefined) return null;

  return (
    <p role="status" className="text-muted-foreground px-4 pb-2 text-xs">
      {notice}
    </p>
  );
}
