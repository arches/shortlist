import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { couldBeSignedIn, forgetSession } from "@/session/store";
import { invalid, issuedPair, lastRequestWith, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import type { Mock } from "vitest";

// Derived from signing-in.scenarios.md: "Signing up", "Signing up with an
// address that already has an account", and the Scenario Outline "Details
// Shortlist will not accept".
//
// Mounted through the real router, because the outcome the scenario names is
// where the owner ends up: "Then my list opens ... And I am not asked to sign
// in."
async function fillIn(name: string, email: string, password: string) {
  // The router mounts the route asynchronously, so the form is waited for
  // rather than assumed.
  await screen.findByRole("button", { name: "Sign up" });

  // One row of the outline gives no name at all, which is a field left as the
  // owner found it rather than anything typed into it.
  await fill("Name", name);
  await fill("Email", email);
  await fill("Password", password);
  await userEvent.click(screen.getByRole("button", { name: "Sign up" }));
}

async function fill(label: string, value: string) {
  if (value === "") return;

  await userEvent.type(screen.getByLabelText(label), value);
}

describe("the sign-up screen", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Scenario: Signing up
  describe("with details Shortlist accepts", () => {
    beforeEach(() => {
      fetchMock.mockResolvedValueOnce(issuedPair("nora"));
      // The list the new owner lands on, which has nothing on it.
      fetchMock.mockResolvedValue(respond(200, []));
    });

    it("opens my list without asking me to sign in", async () => {
      renderApp("/sign-up");

      await fillIn("Nora Vance", "nora.vance@fastmail.com", "quiet-lemon-garden-fence");

      expect(await screen.findByRole("heading", { name: "My list" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Sign up" })).not.toBeInTheDocument();
    });

    it("keeps the session it was issued", async () => {
      renderApp("/sign-up");

      await fillIn("Nora Vance", "nora.vance@fastmail.com", "quiet-lemon-garden-fence");
      await screen.findByRole("heading", { name: "My list" });

      expect(couldBeSignedIn()).toBe(true);
    });

    it("sends the name, the address and the password", async () => {
      renderApp("/sign-up");

      await fillIn("Nora Vance", "nora.vance@fastmail.com", "quiet-lemon-garden-fence");
      await screen.findByRole("heading", { name: "My list" });

      const request = lastRequestWith(fetchMock, "POST");
      expect(request.path).toBe("/api/users");
      expect(request.body).toEqual({
        name: "Nora Vance",
        email: "nora.vance@fastmail.com",
        password: "quiet-lemon-garden-fence",
      });
    });
  });

  // Scenario: Signing up with an address that already has an account
  describe("with an address that already has an account", () => {
    beforeEach(() => {
      fetchMock.mockResolvedValueOnce(invalid({ email: ["Email already has an account"] }));
    });

    it("says that address already has an account", async () => {
      renderApp("/sign-up");

      await fillIn("Sam Reed", "sam.reed@fastmail.com", "quiet-lemon-garden-fence");

      expect(await screen.findByRole("alert")).toHaveTextContent("already has an account");
    });

    it("leaves me on the sign-up form, signed out", async () => {
      renderApp("/sign-up");

      await fillIn("Sam Reed", "sam.reed@fastmail.com", "quiet-lemon-garden-fence");
      await screen.findByRole("alert");

      expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
      expect(couldBeSignedIn()).toBe(false);
    });

    // "And I am invited to sign in instead."
    it("invites me to sign in instead", async () => {
      renderApp("/sign-up");

      await fillIn("Sam Reed", "sam.reed@fastmail.com", "quiet-lemon-garden-fence");
      await screen.findByRole("alert");

      expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    });
  });

  // Scenario Outline: Details Shortlist will not accept
  describe("with details Shortlist will not accept", () => {
    type Row = [string, { name: string; email: string; password: string }, Record<string, string[]>];

    const rows: Row[] = [
      [
        "shorter than twelve characters",
        { name: "Nora Vance", email: "nora.vance@fastmail.com", password: "lemon" },
        { password: ["Password is too short (minimum is 12 characters)"] },
      ],
      [
        "not an email address",
        { name: "Nora Vance", email: "nora.vance", password: "quiet-lemon-garden-fence" },
        { email: ["Email is invalid"] },
      ],
      [
        "no name given",
        { name: "", email: "nora.vance@fastmail.com", password: "quiet-lemon-garden-fence" },
        { name: ["Name can't be blank"] },
      ],
    ];

    it.each(rows)("says what to fix, where %s", async (_why, typed, errors) => {
      fetchMock.mockResolvedValueOnce(invalid(errors));
      renderApp("/sign-up");

      await fillIn(typed.name, typed.email, typed.password);

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(String(Object.values(errors).flat()[0]));
    });

    it.each(rows)("signs me in to nothing, where %s", async (_why, typed, errors) => {
      fetchMock.mockResolvedValueOnce(invalid(errors));
      renderApp("/sign-up");

      await fillIn(typed.name, typed.email, typed.password);
      await screen.findByRole("alert");

      expect(couldBeSignedIn()).toBe(false);
      expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
    });

    // Every message, not the first one, so a form with three things wrong is
    // not corrected three submissions at a time.
    it("reads out everything that needs fixing at once", async () => {
      fetchMock.mockResolvedValueOnce(
        invalid({
          email: ["Email is invalid"],
          name: ["Name can't be blank"],
          password: ["Password is too short (minimum is 12 characters)"],
        }),
      );
      renderApp("/sign-up");

      await fillIn("", "nora.vance", "lemon");

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Email is invalid");
      expect(alert).toHaveTextContent("Name can't be blank");
      expect(alert).toHaveTextContent("Password is too short (minimum is 12 characters)");
    });
  });

  // Verifying an email address is out of scope: Shortlist sends no email, and
  // the address is a sign-in identifier it never has to trust.
  it("asks for nothing beyond a name, an address and a password", async () => {
    renderApp("/sign-up");

    await screen.findByRole("button", { name: "Sign up" });

    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.queryByText(/verif/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/confirm/i)).not.toBeInTheDocument();
  });
});
