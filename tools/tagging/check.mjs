#!/usr/bin/env node
/**
 * CLI entry point for the compliance check.
 *
 *   node tools/tagging/check.mjs                  # scan the whole app
 *   node tools/tagging/check.mjs --base origin/main  # scan only what the PR changed
 *   node tools/tagging/check.mjs --json out.json  # machine-readable result
 *
 * Exit code 0 = COMPLIANT, 1 = NON_COMPLIANT, 2 = the check itself failed.
 */

import { appendFileSync, writeFileSync } from "node:fs";
import {
	analyze,
	listAllSourceFiles,
	listChangedSourceFiles,
} from "./analyzer.mjs";
import { renderConsole, renderMarkdown } from "./report.mjs";
import { loadPolicy, REPO_ROOT } from "./rules.mjs";

function parseArgs(argv) {
	const args = {
		base: null,
		json: null,
		markdown: null,
		summary: false,
		soft: false,
	};
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--base") args.base = argv[++i];
		else if (argv[i] === "--json") args.json = argv[++i];
		else if (argv[i] === "--markdown") args.markdown = argv[++i];
		else if (argv[i] === "--summary") args.summary = true;
		else if (argv[i] === "--soft") args.soft = true;
	}
	return args;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const { policy, rulesPath } = loadPolicy(REPO_ROOT);

	let files;
	let mode;
	if (args.base) {
		mode = `changed files vs ${args.base}`;
		try {
			files = listChangedSourceFiles(args.base);
		} catch (error) {
			console.error(
				`Could not diff against "${args.base}" (${error.message.trim()}). Falling back to a full scan.`,
			);
			files = await listAllSourceFiles();
			mode = "full scan (diff unavailable)";
		}
	} else {
		files = await listAllSourceFiles();
		mode = "full scan";
	}

	const result = analyze({ policy, files });
	result.mode = mode;
	result.rulesFile = "TAGGING_RULES.md";

	console.log(`Rules: ${rulesPath}`);
	console.log(`Mode:  ${mode}`);
	console.log(renderConsole(result));

	if (args.json) {
		writeFileSync(args.json, JSON.stringify(result, null, 2));
	}

	// GitHub Actions: job summary + outputs.
	const ctx = {
		fixUrl: process.env.TAGGING_FIX_URL || null,
		commentCommand: process.env.TAGGING_FIX_COMMAND || null,
	};
	const markdown = renderMarkdown(result, ctx);
	if (args.markdown) writeFileSync(args.markdown, markdown);
	if (args.summary && process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
	}
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(
			process.env.GITHUB_OUTPUT,
			`status=${result.status}\nviolations=${result.violations.length}\n`,
		);
	}

	process.exit(result.status === "COMPLIANT" || args.soft ? 0 : 1);
}

main().catch((error) => {
	console.error(`Tagging compliance check failed to run: ${error.message}`);
	process.exit(2);
});
