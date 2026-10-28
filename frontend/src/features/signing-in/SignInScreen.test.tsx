import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { couldBeSignedIn, forgetSession } from "@/session/store";
import { issuedPair, refused, requestAt } from "@/test/http";

import { SignInScreen } from "./SignInScreen";

// Derived from signing-in.scenarios.md: the main path and the Scenario Outline
// "Credentials that do not match an account".
async function fillIn(email: string, password: string) {
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("the sign-in screen", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    window.localStorage.clear();
    forgetSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Scenario: Signing in to reach my list
  it("opens the list once the credentials are accepted", async () => {
    const onSignedIn = vi.fn();
    fetchMock.mockResolvedValueOnce(issuedPair("one"));
    render(<SignInScreen onSignedIn={onSignedIn} />);

    await fillIn("sam.reed@fastmail.com", "correct-horse-battery-staple");

    expect(onSignedIn).toHaveBeenCalledOnce();
    expect(couldBeSignedIn()).toBe(true);
  });

  it("sends what was typed", async () => {
    fetchMock.mockResolvedValueOnce(issuedPair("one"));
    render(<SignInScreen onSignedIn={vi.fn()} />);

    await fillIn("sam.reed@fastmail.com", "correct-horse-battery-staple");

    expect(requestAt(fetchMock, 0).body).toEqual({
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
      const onSignedIn = vi.fn();
      fetchMock.mockResolvedValueOnce(refused(refusal));
      render(<SignInScreen onSignedIn={onSignedIn} />);

      await fillIn(email, password);

      expect(await screen.findByRole("alert")).toHaveTextContent(refusal);
      expect(onSignedIn).not.toHaveBeenCalled();
      expect(couldBeSignedIn()).toBe(false);
    });

    it("shows nothing that names the email or the password specifically", async () => {
      fetchMock.mockResolvedValueOnce(refused(refusal));
      render(<SignInScreen onSignedIn={vi.fn()} />);

      await fillIn("nobody@fastmail.com", "hunter2");

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toBe(refusal);
    });
  });

  // Recovering a forgotten password is out of scope: Shortlist sends no email,
  // so there is nothing to offer.
  it("offers no password recovery", () => {
    render(<SignInScreen onSignedIn={vi.fn()} />);

    expect(screen.queryByText(/forgot/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reset/i)).not.toBeInTheDocument();
  });

  it("offers no way to create an account, because nothing in Shortlist does that", () => {
    render(<SignInScreen onSignedIn={vi.fn()} />);

    expect(screen.queryByText(/sign up/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/create an account/i)).not.toBeInTheDocument();
  });
});
