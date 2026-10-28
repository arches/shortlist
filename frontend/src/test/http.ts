import { vi, type Mock } from "vitest";

// Every suite below the API client needs the same few canned responses, and a
// helper that captures nothing from its caller belongs out here rather than
// being rebuilt inside each describe block.

export function respond(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === null ? "" : JSON.stringify(body)),
  };
}

// signing-in.scenarios.md: signing in returns two things, and renewal returns a
// fresh pair of both. The suffix is how a test tells one pair from the next.
export function issuedPair(suffix: string) {
  return respond(201, {
    access_token: `access-${suffix}`,
    refresh_token: `refresh-${suffix}`,
    expires_in: 900,
  });
}

export function refused(error = "Sign in to continue.") {
  return respond(401, { error });
}

export function notFound(error = "No such restaurant is on your list.") {
  return respond(404, { error });
}

export function invalid(errors: Record<string, string[]>) {
  return respond(422, { errors });
}

export function noContent() {
  return respond(204, null);
}

// The request a test wants to assert about, already narrowed to the parts that
// carry anything: the path, the headers and the body.
export function requestAt(fetchMock: Mock, index: number) {
  const call = fetchMock.mock.calls.at(index);
  if (!call) throw new Error(`fetch was not called ${index + 1} time(s)`);

  const [path, init] = call as [string, { headers: Headers; body?: string }];

  return {
    path,
    headers: init.headers,
    body: init.body === undefined ? undefined : (JSON.parse(init.body) as unknown),
  };
}

// The request a test is about, when later calls have landed on top of it. A
// mutation is followed by the refetches it invalidates, so the last call is
// rarely the one under test — and a refetch can share the mutation's path,
// which makes "the last call" quietly wrong rather than obviously wrong.
function methodOf(call: unknown[] | undefined): string | undefined {
  return (call?.at(1) as { method?: string } | undefined)?.method;
}

export function lastRequestWith(fetchMock: Mock, method: string) {
  const calls = fetchMock.mock.calls as unknown[][];

  // Walked backwards by hand rather than with findLastIndex, which the
  // project's TypeScript lib target does not carry.
  for (let index = calls.length - 1; index >= 0; index -= 1) {
    if (methodOf(calls[index]) === method) return requestAt(fetchMock, index);
  }

  throw new Error(`no ${method} request was made`);
}

export function requestsWith(fetchMock: Mock, method: string): unknown[][] {
  return (fetchMock.mock.calls as unknown[][]).filter((call) => methodOf(call) === method);
}

export function pathsRequested(fetchMock: Mock): string[] {
  return fetchMock.mock.calls.map((call) => String(call.at(0)));
}

export function stubFetch(): Mock {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
