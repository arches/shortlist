import { Star } from "./Stars";
import { RATINGS, STAR_POSITIONS, fillOf, ratingReads } from "./rating";

interface RatingInputProps {
  value: number | null;
  onChange: (rating: number | null) => void;
}

// managing-experiences.wireframe.drawio.svg: "One control, nine reachable
// values, and no way to express 0, 3.7 or 5.5 — the three things the scenarios
// reject. A slider or a number field would let the owner type all three."
//
// So the nine are the control. Each star carries two of them: "Click the left
// half of a star for a half star" — the left half of the third star is 2.5 and
// its right half is 3. No rating is the default, and it is not a score of
// nought, which is why Clear is a separate act rather than a tenth value.
//
// The wireframe specifies the mouse and nothing else. Drawn as nine radios
// under the stars, the halves are reachable by keyboard and announced as the
// values they are, rather than as regions of a picture.
const SPANS = {
  left: "left-0 w-1/2",
  right: "right-0 w-1/2",
  whole: "left-0 w-full",
} as const;

function Half({
  rating,
  span,
  checked,
  onChange,
}: {
  rating: number;
  span: keyof typeof SPANS;
  checked: boolean;
  onChange: (rating: number) => void;
}) {
  const stars = rating === 1 ? "1 star" : `${rating} stars`;

  return (
    <label className={`absolute inset-y-0 cursor-pointer ${SPANS[span]}`}>
      <input
        type="radio"
        name="rating"
        className="sr-only"
        aria-label={stars}
        checked={checked}
        onChange={() => onChange(rating)}
      />
    </label>
  );
}

export function RatingInput({ value, onChange }: RatingInputProps) {
  return (
    <div role="group" aria-label="Rating" className="flex items-center gap-3">
      <div className="flex text-xl leading-none">
        {STAR_POSITIONS.map((position) => {
          // The values this star carries: the half-step into it and the whole
          // of it. The first star carries only 1, because 1 is "the lowest
          // there is" and what sits below it is no rating, not a half of one.
          const carried = RATINGS.filter(
            (rating) => rating > position - 1 && rating <= position,
          );

          return (
            <span key={position} className="relative inline-block">
              <Star fill={fillOf(value, position)} />

              {/*
                The half-step first, so the nine read 1, 1.5, 2, 2.5 … in the
                order they are reached — left half of a star below its whole,
                which is how the wireframe draws the choice.
              */}
              {carried.map((rating, index) => (
                <Half
                  key={rating}
                  rating={rating}
                  span={carried.length === 1 ? "whole" : index === 0 ? "left" : "right"}
                  checked={value === rating}
                  onChange={onChange}
                />
              ))}
            </span>
          );
        })}
      </div>

      <span className="text-sm tabular-nums">{ratingReads(value)}</span>

      {/*
        "Clear leaves it with no rating at all." Offered only once there is
        something to clear, as the restaurant form does with its own fields.
      */}
      {value !== null && (
        <button
          type="button"
          aria-label="Clear rating"
          className="text-muted-foreground hover:text-foreground text-sm"
          onClick={() => onChange(null)}
        >
          Clear ✕
        </button>
      )}
    </div>
  );
}
