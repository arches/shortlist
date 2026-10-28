import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RatingInput } from "./RatingInput";
import { RATINGS } from "./rating";

// Derived from the rating control drawn in
// managing-experiences.wireframe.drawio.svg and from the nine values fixed in
// shortlist.data.md's Enumerations.
// How the control announces one of the nine.
function starsNamed(rating: number): string {
  return rating === 1 ? "1 star" : `${rating} stars`;
}

describe("picking a rating", () => {
  // "No rating — the default, and not a score of nought."
  describe("no rating", () => {
    it("is where the control starts", () => {
      render(<RatingInput value={null} onChange={vi.fn()} />);

      expect(screen.getByText("No rating")).toBeInTheDocument();
      expect(screen.getAllByRole("radio").filter((radio) => (radio as HTMLInputElement).checked))
        .toHaveLength(0);
    });

    // It is the absence of a rating, so there is no nought to pick.
    it("is not reachable as a value of its own", () => {
      render(<RatingInput value={null} onChange={vi.fn()} />);

      expect(screen.queryByRole("radio", { name: "0 stars" })).not.toBeInTheDocument();
    });
  });

  // "Nine values: 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5."
  describe("the nine", () => {
    for (const rating of RATINGS) {
      it(`reaches ${rating}`, async () => {
        const onChange = vi.fn();
        render(<RatingInput value={null} onChange={onChange} />);

        await userEvent.click(screen.getByRole("radio", { name: starsNamed(rating) }));

        expect(onChange).toHaveBeenCalledWith(rating);
      });
    }

    it("offers exactly nine and no more", () => {
      render(<RatingInput value={null} onChange={vi.fn()} />);

      expect(screen.getAllByRole("radio")).toHaveLength(9);
    });

    // "Choosing a half": the left half of a star is the half-step below it and
    // the right half is the whole. Asserted as the order the nine sit in, which
    // is what pairs each half with its star.
    it("pairs each star with the half below it, left half first", () => {
      render(<RatingInput value={null} onChange={vi.fn()} />);

      const names = screen
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("aria-label"));

      expect(names).toEqual([
        "1 star", "1.5 stars",
        "2 stars", "2.5 stars",
        "3 stars", "3.5 stars",
        "4 stars", "4.5 stars",
        "5 stars",
      ]);
    });

    it("shows the rating it is currently on", () => {
      render(<RatingInput value={3.5} onChange={vi.fn()} />);

      expect(screen.getByText("3.5")).toBeInTheDocument();
      expect((screen.getByRole("radio", { name: "3.5 stars" }) as HTMLInputElement).checked)
        .toBe(true);
    });
  });

  // "No way to express 0, 3.7 or 5.5 — the three things the scenarios reject.
  // A slider or a number field would let the owner type all three."
  describe("the three the scenarios reject", () => {
    for (const rejected of [0, 3.7, 5.5, -2]) {
      it(`cannot express ${rejected}`, () => {
        render(<RatingInput value={null} onChange={vi.fn()} />);

        expect(screen.queryByRole("radio", { name: starsNamed(rejected) })).not.toBeInTheDocument();
      });
    }

    // Nothing to type into is the reason the three are unreachable rather than
    // merely refused.
    it("offers nothing to type a number into", () => {
      render(<RatingInput value={null} onChange={vi.fn()} />);

      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
      expect(screen.queryByRole("slider")).not.toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  // "Clear leaves it with no rating at all."
  describe("clearing", () => {
    it("goes back to no rating", async () => {
      const onChange = vi.fn();
      render(<RatingInput value={3.5} onChange={onChange} />);

      await userEvent.click(screen.getByRole("button", { name: "Clear rating" }));

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("is not offered when there is nothing to clear", () => {
      render(<RatingInput value={null} onChange={vi.fn()} />);

      expect(screen.queryByRole("button", { name: "Clear rating" })).not.toBeInTheDocument();
    });
  });

  // The wireframe specifies the mouse only. Making the nine radios rather than
  // regions of a picture is what gets them to a keyboard.
  it("reaches the nine by keyboard", async () => {
    const onChange = vi.fn();
    render(<RatingInput value={null} onChange={onChange} />);

    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalled();
  });
});
