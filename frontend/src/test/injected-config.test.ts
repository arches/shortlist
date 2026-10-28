// @vitest-environment node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// shortlist.principles.md, "Frontend env vars are injected", states its own
// enforcement: the injected-config expression appears nowhere under frontend/src.
//
// The bundle carries no configuration. The one environment-specific thing the
// frontend needs is the API's own address, and that is inferred from where the
// frontend is running — every request goes to a relative /api path — so there is
// nothing to inject and no fetch stands between load and first paint. Anything
// the frontend cannot infer gets served by the API instead.
//
// The expression is assembled from parts rather than written out, so this file is
// scanned on the same terms as every other one and needs no exemption.
const FORBIDDEN = ["import", "meta", "env"].join(".");

const SOURCE_ROOT = fileURLToPath(new URL("..", import.meta.url));

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }

    return /\.(ts|tsx|js|jsx|css)$/.test(entry) ? [path] : [];
  });
}

describe("the frontend bundle", () => {
  const files = sourceFiles(SOURCE_ROOT);

  it("has source files to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("reads no injected configuration anywhere under src", () => {
    const offenders = files
      .filter((path) => readFileSync(path, "utf8").includes(FORBIDDEN))
      .map((path) => path.replace(SOURCE_ROOT, "src/"));

    expect(offenders).toEqual([]);
  });
});
