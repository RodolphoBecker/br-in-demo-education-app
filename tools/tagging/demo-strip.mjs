#!/usr/bin/env node
/**
 * Regenerates a demo fixture by removing every piece of analytics tagging from
 * a real page.
 *
 *   node tools/tagging/demo-strip.mjs                 # home page  -> demo/home-page.untagged.tsx
 *   node tools/tagging/demo-strip.mjs reports         # /reports   -> demo/reports-page.untagged.tsx
 *
 * The output is the "before" state of the demo: the same page, differing from
 * the real one only in that it carries no tagging. Regenerate it whenever the
 * page itself changes, so the demo never drifts from the application.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEMO_TARGETS } from "./demo-targets.mjs";
import { loadPolicy, REPO_ROOT, readSource } from "./rules.mjs";
import { findOpenTagEnd } from "./scanner.mjs";

const FIXTURE_MARKER = "// --- fixture content below ---";

/**
 * Drops a `.map((item, index) => …)` index parameter when the callback body no
 * longer mentions it — removing `trackingPosition={index}` is what orphaned it.
 */
function dropUnusedMapIndex(source) {
	let out = source;
	const callback = /\.map\(\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*=>\s*/g;

	for (;;) {
		callback.lastIndex = 0;
		let changed = false;

		for (const match of [...out.matchAll(callback)]) {
			const [whole, item, index] = match;
			const bodyStart = match.index + whole.length;
			const body = balancedSlice(out, bodyStart);
			if (body === null || new RegExp(`\\b${index}\\b`).test(body)) continue;

			out = `${out.slice(0, match.index)}.map((${item}) => ${out.slice(bodyStart)}`;
			changed = true;
			break; // offsets moved; rescan
		}

		if (!changed) return out;
	}
}

/** Text of the bracketed expression starting at `start`. */
function balancedSlice(source, start) {
	const open = source[start];
	const close = { "(": ")", "{": "}" }[open];
	if (!close) return null;

	let depth = 0;
	for (let i = start; i < source.length; i++) {
		if (source[i] === open) depth++;
		else if (source[i] === close) {
			depth--;
			if (depth === 0) return source.slice(start, i + 1);
		}
	}
	return null;
}

/**
 * Gives every `<button>` an explicit `type`, which is what `<TrackedButton>`
 * renders, so the fixture differs from the real page only in its tagging.
 * The whole opening tag is inspected — a `type` further down it still counts.
 */
function addMissingButtonType(source) {
	let out = source;
	let from = 0;

	for (;;) {
		const at = out.indexOf("<button", from);
		if (at === -1) return out;

		// Not `indexOf(">")`: an `onClick={() => …}` handler contains one.
		const tagEnd = findOpenTagEnd(out, at);
		const openTag = tagEnd === -1 ? "" : out.slice(at, tagEnd);

		if (/\btype\s*=/.test(openTag)) {
			from = at + 7;
			continue;
		}

		const newline = out.indexOf("\n", at);
		const indent = /^(\t*)/.exec(out.slice(newline + 1))?.[1] ?? "\t\t";
		out = `${out.slice(0, newline + 1)}${indent}type="button"\n${out.slice(newline + 1)}`;
		from = at + 7;
	}
}

/** Removes a now-unused prop from a local helper component. */
function dropUnusedProp(source, prop) {
	if (new RegExp(`\\b${prop}\\b`).test(source) === false) return source;

	let out = source;
	// type member, destructured binding, and every call site
	out = out.replace(new RegExp(`\\n\\t*${prop}: [^;\\n]+;`, "g"), "");
	out = out.replace(new RegExp(`\\n\\t*${prop},(?=\\n)`, "g"), "");
	out = out.replace(new RegExp(`\\n\\t*${prop}=\\{[^}]*\\}`, "g"), "");
	return out;
}

function strip(source, policy) {
	const { pageAnalytics, trackedLink, trackedButton } = policy.conventions;
	const trackingProps = [
		...pageAnalytics.requiredProps,
		...trackedLink.requiredProps,
		...trackedLink.recommendedProps,
		...trackedButton.requiredProps,
		...trackedButton.recommendedProps,
	].filter((prop) => prop.startsWith("tracking"));

	let out = source;

	// 1. Imports of the tagging components; pull in next/link in their place.
	const usesLink = new RegExp(`<${trackedLink.component}(?=[\\s/>])`).test(out);
	for (const component of [
		pageAnalytics.component,
		trackedButton.component,
		trackedLink.component,
	]) {
		out = out.replace(
			new RegExp(`^import \\{ ${component} \\} from "[^"]+";\\n`, "m"),
			"",
		);
	}
	if (usesLink) {
		out = out.replace(
			/^(?:"use client";\n\n)?/,
			(directive) => `${directive}import Link from "next/link";\n`,
		);
	}

	// 2. The page-level marker.
	out = out.replace(
		new RegExp(`\\n\\t*<${pageAnalytics.component}[^>]*/>`),
		"",
	);

	// 3. Tagging props, inline or one per line.
	out = out.replace(
		new RegExp(
			`\\s*(?:${trackingProps.join("|")})=(?:\\{(?:[^{}]|\\{[^}]*\\})*\\}|"[^"]*")`,
			"g",
		),
		"",
	);

	// 4. Tagged components become plain elements.
	out = out
		.replace(new RegExp(`<${trackedLink.component}(?=[\\s/>])`, "g"), "<Link")
		.replace(new RegExp(`</${trackedLink.component}>`, "g"), "</Link>")
		.replace(
			new RegExp(`<${trackedButton.component}(?=[\\s/>])`, "g"),
			"<button",
		)
		.replace(new RegExp(`</${trackedButton.component}>`, "g"), "</button>");

	// 5. <TrackedButton> renders type="button"; keep bare buttons identical.
	out = addMissingButtonType(out);

	// 6. Tidy up what the removals orphaned.
	out = dropUnusedMapIndex(out);
	out = dropUnusedProp(out, "offset");

	return out;
}

const key = process.argv[2] ?? "home";
const target = DEMO_TARGETS[key];
if (!target) {
	console.error(
		`Unknown demo target "${key}". Available: ${Object.keys(DEMO_TARGETS).join(", ")}.`,
	);
	process.exit(1);
}

const { policy } = loadPolicy(REPO_ROOT);
const source = readSource(join(REPO_ROOT, target.page));

writeFileSync(
	join(REPO_ROOT, target.fixture),
	`${target.banner}\n${FIXTURE_MARKER}\n\n${strip(source, policy)}`,
);

console.log(`Regenerated ${target.fixture} from ${target.page}.`);
console.log("Next: bun run check:write && bun run demo:reset");
