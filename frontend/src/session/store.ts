import type { IssuedSession } from "@/api/types";

// shortlist.glossary.md: a Session is not an entity. What is stored is a Refresh
// token, and a Session outlives any one access token issued within it.
//
// The access token lives in memory only: it lasts about fifteen minutes, so
// persisting it buys nothing. The refresh token is persisted, because "Coming
// back after my refresh token has expired" is reached by an owner who closed
// the browser and came back — that path only exists if the token survived.
//
// Not a cookie. Shortlist sets none.
const REFRESH_TOKEN_KEY = "shortlist.refresh_token";

let accessToken: string | undefined;

export function currentAccessToken(): string | undefined {
  return accessToken;
}

export function storedRefreshToken(): string | undefined {
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? undefined;
  } catch {
    // A browser that refuses storage still works for one session's length.
    return undefined;
  }
}

export function rememberSession(issued: IssuedSession): void {
  accessToken = issued.access_token;

  try {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, issued.refresh_token);
  } catch {
    // Nothing to do: the session simply will not survive a reload.
  }
}

export function forgetSession(): void {
  accessToken = undefined;

  try {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Already unreachable, which is the state we wanted.
  }
}

// An owner is signed in if a Session can still be continued — which is true of
// one whose access token has run out but whose refresh token has not.
export function couldBeSignedIn(): boolean {
  return accessToken !== undefined || storedRefreshToken() !== undefined;
}
