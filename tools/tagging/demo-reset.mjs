#!/usr/bin/env node
/**
 * Stages the "before" state of the demo by copying a fixture over the real page.
 *
 *   node tools/tagging/demo-reset.mjs           # home page (the primary demo)
 *   node tools/tagging/demo-reset.mjs reports   # the shorter /reports scenario
 *
 * Everything below the fixture's marker line is copied verbatim; the banner
 * above it is dropped. Restore the tagged page with `git checkout` (or by
 * running `bun run tagging:fix`).
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEMO_TARGETS } from "./demo-targets.mjs";
import { REPO_ROOT, readSource } from "./rules.mjs";

const FIXTURE_MARKER = "// --- fixture content below ---";

const key = process.argv[2] ?? "home";
const target = DEMO_TARGETS[key];
if (!target) {
	console.error(
		`Unknown demo target "${key}". Available: ${Object.keys(DEMO_TARGETS).join(", ")}.`,
	);
	process.exit(1);
}

const fixture = readSource(join(REPO_ROOT, target.fixture));
const markerAt = fixture.indexOf(FIXTURE_MARKER);
if (markerAt === -1) {
	console.error(
		`${target.fixture} has no "${FIXTURE_MARKER}" line. Regenerate it with \`bun run demo:strip ${key}\`.`,
	);
	process.exit(1);
}

const body = fixture
	.slice(markerAt + FIXTURE_MARKER.length)
	.replace(/^\n+/, "");
writeFileSync(join(REPO_ROOT, target.page), body);

console.log(`Demo staged: ${target.page} (${target.route}) is now untagged.`);
console.log("Next: bun run tagging:check");
