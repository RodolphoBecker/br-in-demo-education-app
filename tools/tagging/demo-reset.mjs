#!/usr/bin/env node
/**
 * Restores the "before" state of the demo so the whole flow can be replayed:
 * copies demo/reports-page.untagged.tsx over src/app/reports/page.tsx.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./rules.mjs";

const FIXTURE = join(REPO_ROOT, "demo", "reports-page.untagged.tsx");
const TARGET = join(REPO_ROOT, "src", "app", "reports", "page.tsx");

const fixture = readFileSync(FIXTURE, "utf8");
// Drop the fixture's explanatory banner; keep the component itself.
const body = fixture.slice(fixture.indexOf('"use client";'));

writeFileSync(TARGET, body);
console.log("Demo reset: src/app/reports/page.tsx is untagged again.");
console.log("Next: bun run tagging:check");
