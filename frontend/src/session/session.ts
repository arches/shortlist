import { ApiError, request } from "@/api/client";
import type { IssuedSession, RequestOptions } from "@/api/types";
import {
  currentAccessToken,
  forgetSession,
  rememberSession,
  storedRefreshToken,
} from "./store";

export class SessionEnded extends Error {
  constructor() {
    super("Sign in to continue.");
    this.name = "SessionEnded";
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const issued = await request<IssuedSession>("/session", {
    method: "POST",
    body: { email, password },
  });

  rememberSession(issued);
}

// signing-in.scenarios.md: signing out destroys every refresh token the owner
// has, so no device can renew again. The local tokens go whether or not the API
// answered — an owner who pressed sign out is signed out here regardless.
export async function signOut(): Promise<void> {
  try {
    await request<null>("/session", { method: "DELETE", accessToken: currentAccessToken() });
  } finally {
    forgetSession();
  }
}

async function renew(): Promise<void> {
  const refreshToken = storedRefreshToken();
  if (refreshToken === undefined) throw new SessionEnded();

  try {
    const issued = await request<IssuedSession>("/session/renewal", {
      method: "POST",
      body: { refresh_token: refreshToken },
    });

    rememberSession(issued);
  } catch (thrown) {
    // A refused renewal is the thing that actually means the session is over.
    if (thrown instanceof ApiError && thrown.isRefusal) {
      forgetSession();
      throw new SessionEnded();
    }

    throw thrown;
  }
}

// The renewal is the thing being specified by "Staying on my list longer than an
// access token lasts", and the only way to see it is from the outside: an owner
// who stays longer than fifteen minutes notices nothing.
//
// Reaching the end of a session takes two refusals rather than one. The request
// is refused, renewal is attempted because an expired access token is the
// ordinary reason for a refusal, and only when the renewal is also refused has
// the session actually ended. A single refusal is not evidence of anything,
// which is why the attempt has to come first.
export async function authenticated<T>(
  path: string,
  options: Omit<RequestOptions, "accessToken"> = {},
): Promise<T> {
  try {
    return await request<T>(path, { ...options, accessToken: currentAccessToken() });
  } catch (thrown) {
    if (!(thrown instanceof ApiError) || !thrown.isRefusal) throw thrown;

    await renew();

    // One retry, with the fresh pair. A second refusal is not retried again:
    // the token is new, so a refusal of it means something else is wrong.
    return await request<T>(path, { ...options, accessToken: currentAccessToken() });
  }
}
