import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Stars } from "./Stars";
import { RATINGS, fillOf, type StarFill } from "./rating";

// Derived from shortlist.data.md's Enumerations — nine values, no zero, and can
// be empty — and from the rating control drawn in
// managing-experiences.wireframe.drawio.svg.
describe("drawing a rating as stars", () => {
  // The wireframe's own legend: 1 is "the lowest there is", 2.5 shows "half
  // steps all the way up", 5 is "the top", and no rating is "the default, and
  // not a score of nought".
  // An array rather than an object keyed by rating: JavaScript orders
  // integer-like keys ahead of fractional ones, so an object could not state
  // "the nine, in order" at all.
  const expected: [number, StarFill[]][] = [
    [1, ["full", "empty", "empty", "empty", "empty"]],
    [1.5, ["full", "half", "empty", "empty", "empty"]],
    [2, ["full", "full", "empty", "empty", "empty"]],
    [2.5, ["full", "full", "half", "empty", "empty"]],
    [3, ["full", "full", "full", "empty", "empty"]],
    [3.5, ["full", "full", "full", "half", "empty"]],
    [4, ["full", "full", "full", "full", "empty"]],
    [4.5, ["full", "full", "full", "full", "half"]],
    [5, ["full", "full", "full", "full", "full"]],
  ];

  it("covers each of the nine and nothing else", () => {
    expect(expected.map(([rating]) => rating)).toEqual([...RATINGS]);
  });

  for (const [rating, fills] of expected) {
    it(`draws ${rating} as ${fills.join(", ")}`, () => {
      const drawn = [1, 2, 3, 4, 5].map((position) => fillOf(rating, position));

      expect(drawn).toEqual(fills);
    });
  }

  // No rating is the absence of one, not a nought. Five empty stars, and
  // nothing filled in even partly.
  it("draws no rating as five empty stars", () => {
    const drawn = [1, 2, 3, 4, 5].map((position) => fillOf(null, position));

    expect(drawn).toEqual(["empty", "empty", "empty", "empty", "empty"]);
  });

  // The wireframe writes the number beside the stars.
  it("writes the number beside the stars", () => {
    render(<Stars rating={3.5} />);

    expect(screen.getByText("3.5")).toBeInTheDocument();
  });

  it("writes a whole rating without a decimal", () => {
    render(<Stars rating={4} />);

    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("says so in words when there is no rating", () => {
    render(<Stars rating={null} />);

    expect(screen.getByText("No rating")).toBeInTheDocument();
  });
});
