// shortlist.principles.md: the frontend bundle carries no configuration. The
// API's address is inferred from where the frontend is running, which is what a
// relative path is — same origin, resolved by the browser, nothing injected and
// nothing fetched before first paint.
const API_ROOT = "/api";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  // signing-in.scenarios.md: a refusal is the ordinary consequence of an access
  // token running out, so the first response to one is to renew rather than to
  // give up. Only a refused renewal means the session has actually ended.
  get isRefusal(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  // A refusal that has something to say per attribute, as the API sends it.
  get attributeErrors(): Record<string, string[]> {
    if (typeof this.body !== "object" || this.body === null) return {};

    const errors = (this.body as { errors?: unknown }).errors;
    return typeof errors === "object" && errors !== null
      ? (errors as Record<string, string[]>)
      : {};
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  accessToken?: string | undefined;
}

function messageFrom(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null) {
    const single = (body as { error?: unknown }).error;
    if (typeof single === "string") return single;

    const errors = (body as { errors?: Record<string, string[]> }).errors;
    if (errors) {
      const first = Object.values(errors).flat()[0];
      if (first) return first;
    }
  }

  return `The request failed (${status}).`;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, accessToken } = options;

  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  // The glossary rules out cookies — Shortlist sets none — so the access token
  // travels in the header.
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // 204 carries nothing, which is what signing out and taking a restaurant off
  // the list both return.
  const text = await response.text();
  const parsed: unknown = text.length > 0 ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(response.status, parsed, messageFrom(parsed, response.status));
  }

  return parsed as T;
}
