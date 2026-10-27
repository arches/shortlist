# Shortlist

Shortlist tracks restaurants a user wants to visit and notes about ones they have visited. The authoritative description of the system lives in `/docs`, not in this file and not in any conversation.

## Workflow: artifacts first, code second

Decisions are recorded in `/docs` as Alloy artifacts. Code is generated **in a separate session, from those artifacts alone**. Anything decided only in chat is lost by design — if a decision matters, it goes in an artifact or it does not exist.

This splits sessions into two kinds, and you are always in exactly one of them:

**Design sessions** edit files in `/docs` and nothing else. Do not scaffold code, config, package manifests, or tooling, and do not run `git init` or install dependencies. If a design session surfaces something that needs code, write it down as a slot in an artifact and stop there.

**Code sessions** read `/docs` and write code. Treat the artifacts as the complete specification. Identifiers come from the artifacts.

### Working with the Alloy catalog

The catalog is the authority on which artifact types exist and what belongs in each. Find it in the Alloy plugin. Never author a type that has no catalog entry, and never work from a type recalled from memory.

Use `/alloy:author` to write one, and `/alloy:fit` to check an existing one against its entry. Read the entry in full before authoring against it.

## Diagrams must be legible

Light text on a light background is the recurring failure here, and it has one root cause: a fill color gets set and the text color is left to a default that assumed a different background. The fix is mechanical — **fill color and text color are a single decision, never two**. Whenever you write a `fill` on a shape, write the text color in the same edit.

Specific rules:

- **Paint the page.** Start every SVG with an explicit background `<rect>` covering the full canvas. A transparent SVG inherits whatever is behind it, so dark text vanishes the moment the file is viewed in GitHub's dark mode or a dark editor.
- **Every text element carries an explicit `fill`.** Never rely on inheritance, `currentColor`, or a renderer default.
- **Aim for 4.5:1 contrast** for body text and 3:1 for large or bold text. White on `#1f5c8b` and `#111111` on white both clear it comfortably.
- **Never let color alone carry meaning.** Pair it with shape, stroke weight, or stroke pattern, so the diagram survives greyscale printing and colorblind readers. Any time fill or stroke style means something, the diagram needs a legend.

## Markdown style

Do not hard-wrap paragraphs. One long line per paragraph; the editor wraps.
