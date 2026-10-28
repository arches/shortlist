import { STAR_POSITIONS, fillOf, ratingReads, type StarFill } from "./rating";

// managing-experiences.wireframe.drawio.svg draws a rating as five stars with
// the number beside them: "★★★★☆ 4", "★★★☆☆ 3", three-and-a-half as a half
// star in the fourth position. An experience with no rating gets five empty
// stars and the control's own words for that state, "No rating", which is how
// the wireframe marks the other two absences ("No date", "No notes") too.
//
// The stars are decoration and the number is the text: marking the strip
// aria-hidden stops a reader hearing the rating twice, once as glyphs and once
// as a number.
function Star({ fill }: { fill: StarFill }) {
  if (fill === "full") return <span className="text-foreground">★</span>;
  if (fill === "empty") return <span className="text-muted-foreground">☆</span>;

  // A half is a full star laid over an empty one and clipped down the middle,
  // which is how the wireframe draws it.
  return (
    <span className="relative inline-block">
      <span className="text-muted-foreground">☆</span>
      <span className="text-foreground absolute inset-y-0 left-0 w-1/2 overflow-hidden">★</span>
    </span>
  );
}

export function Stars({ rating }: { rating: number | null }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className="flex leading-none">
        {STAR_POSITIONS.map((position) => (
          <Star key={position} fill={fillOf(rating, position)} />
        ))}
      </span>

      <span className="text-sm tabular-nums">{ratingReads(rating)}</span>
    </span>
  );
}
