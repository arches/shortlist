import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { couldBeSignedIn, forgetSession } from "@/session/store";
import { issuedPair, lastRequestWith, refused, respond, stubFetch } from "@/test/http";
import { renderApp } from "@/test/router";

import type { Mock } from "vitest";

// Derived from signing-in.scenarios.md: the main path and the Scenario Outline
// "Credentials that do not match an account".
async function fillIn(email: string, password: string) {
  await screen.findByRole("button", { name: "Sign in" });

  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("the sign-in screen", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = stubFetch();
    window.localStorage.clear();
    forgetSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Scenario: Signing in to reach my list
  it("opens the list once the credentials are accepted", async () => {
    fetchMock.mockResolvedValueOnce(issuedPair("one"));
    fetchMock.mockResolvedValue(respond(200, []));
    renderApp("/sign-in");

    await fillIn("sam.reed@fastmail.com", "correct-horse-battery-staple");

    expect(await screen.findByRole("region", { name: "My list" })).toBeInTheDocument();
    expect(couldBeSignedIn()).toBe(true);
  });

  it("sends what was typed", async () => {
    fetchMock.mockResolvedValueOnce(issuedPair("one"));
    fetchMock.mockResolvedValue(respond(200, []));
    renderApp("/sign-in");

    await fillIn("sam.reed@fastmail.com", "correct-horse-battery-staple");
    await screen.findByRole("region", { name: "My list" });

    const request = lastRequestWith(fetchMock, "POST");
    expect(request.path).toBe("/api/session");
    expect(request.body).toEqual({
      email: "sam.reed@fastmail.com",
      password: "correct-horse-battery-staple",
    });
  });

  // Scenario Outline: Credentials that do not match an account. One outcome,
  // three causes: the owner is not told which of the two it was, nor whether
  // the address has an account at all.
  describe("credentials that do not match an account", () => {
    const refusal = "The email or password is wrong.";

    it.each([
      ["my account, the wrong password", "sam.reed@fastmail.com", "hunter2"],
      ["no account at that address", "nobody@fastmail.com", "correct-horse-battery-staple"],
      ["neither matches anything", "nobody@fastmail.com", "hunter2"],
    ])("says only that the email or password is wrong, where %s", async (_why, email, password) => {
      fetchMock.mockResolvedValueOnce(refused(refusal));
      renderApp("/sign-in");

      await fillIn(email, password);

      expect(await screen.findByRole("alert")).toHaveTextContent(refusal);
      expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
      expect(couldBeSignedIn()).toBe(false);
    });

    it("shows nothing that names the email or the password specifically", async () => {
      fetchMock.mockResolvedValueOnce(refused(refusal));
      renderApp("/sign-in");

      await fillIn("nobody@fastmail.com", "hunter2");

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toBe(refusal);
    });
  });

  // Recovering a forgotten password is out of scope: Shortlist sends no email,
  // so there is nothing to offer.
  it("offers no password recovery", async () => {
    renderApp("/sign-in");

    await screen.findByRole("button", { name: "Sign in" });

    expect(screen.queryByText(/forgot/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reset/i)).not.toBeInTheDocument();
  });

  // signing-in.scenarios.md: the form carries a "No account? Sign up" link.
  // Creating an account used to be an administrator's act, done outside
  // Shortlist; it is now something anybody does from here.
  it("offers a way to sign up for somebody with no account", async () => {
    renderApp("/sign-in");

    await screen.findByRole("button", { name: "Sign in" });

    expect(screen.getByText("No account?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/sign-up");
  });

  it("reaches the sign-up form by that link", async () => {
    renderApp("/sign-in");
    await screen.findByRole("button", { name: "Sign in" });

    await userEvent.click(screen.getByRole("link", { name: "Sign up" }));

    expect(await screen.findByRole("button", { name: "Sign up" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });
});
