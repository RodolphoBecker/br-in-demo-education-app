#!/usr/bin/env node
/**
 * CLI entry point for "Fix it for me".
 *
 *   node tools/tagging/remediate.mjs                     # fix everything non-compliant
 *   node tools/tagging/remediate.mjs --base origin/main  # fix what the PR changed
 *   node tools/tagging/remediate.mjs --commit            # also create the commit
 *
 * Flow: analyze -> agent applies tagging -> format -> re-analyze to prove it
 * worked -> optionally commit. If the re-analysis still fails, nothing is
 * committed and the run exits non-zero.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { selectAgent } from "./agent/index.mjs";
import {
	analyze,
	listAllSourceFiles,
	listChangedSourceFiles,
} from "./analyzer.mjs";
import { loadPolicy, REPO_ROOT } from "./rules.mjs";

function parseArgs(argv) {
	const args = { base: null, commit: false, summary: false };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--base") args.base = argv[++i];
		else if (argv[i] === "--commit") args.commit = true;
		else if (argv[i] === "--summary") args.summary = true;
	}
	return args;
}

const transcript = [];
const log = (line) => {
	transcript.push(line);
	console.log(line);
};

const git = (...cmd) =>
	execFileSync("git", cmd, { cwd: REPO_ROOT, encoding: "utf8" }).trim();

/** Commit subject, e.g. `feat(analytics): add tagging to Reports page`. */
function commitSubject(result) {
	const routes = [
		...new Set(result.violations.filter((v) => v.route).map((v) => v.route)),
	];
	if (routes.length === 1) {
		const route = routes[0];
		const title =
			route === "/"
				? "Home"
				: route
						.split("/")
						.filter(Boolean)
						.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
						.join(" ");
		return `feat(analytics): add tagging to ${title} page`;
	}
	return "feat(analytics): add missing tagging";
}

/**
 * Runs Biome over the agent's output.
 *
 * `npx biome` silently does nothing when the package was installed by bun, so
 * the locally installed binary is tried first and the runners are only a
 * fallback. Returns true when a run actually succeeded.
 */
function formatWithBiome(files) {
	const local = join(
		REPO_ROOT,
		"node_modules",
		".bin",
		process.platform === "win32" ? "biome.exe" : "biome",
	);
	const candidates = existsSync(local)
		? [[local, []]]
		: [
				["bunx", ["biome"]],
				["npx", ["biome"]],
			];

	for (const [command, prefix] of candidates) {
		const run = spawnSync(command, [...prefix, "check", "--write", ...files], {
			cwd: REPO_ROOT,
			encoding: "utf8",
			shell: process.platform === "win32",
		});
		if (run.status === 0 && /Checked \d+ file/.test(run.stdout ?? ""))
			return true;
	}
	return false;
}

async function collectFiles(base) {
	if (!base) return listAllSourceFiles();
	try {
		return listChangedSourceFiles(base);
	} catch {
		return listAllSourceFiles();
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const { policy } = loadPolicy(REPO_ROOT);
	const agent = selectAgent();

	// 1. Analyze
	const before = analyze({ policy, files: await collectFiles(args.base) });
	if (before.status === "COMPLIANT") {
		log("Nothing to fix — the analyzed files are already compliant.");
		process.exit(0);
	}

	// 2. Agent applies the tagging
	const { changedFiles } = await agent.remediate({
		policy,
		result: before,
		root: REPO_ROOT,
		log,
	});

	if (!changedFiles.length) {
		log("The agent did not change any files.");
		process.exit(1);
	}

	// 3. Format with the repository's own toolchain, so the commit matches the
	//    house style and `bun run check` stays green.
	if (formatWithBiome(changedFiles)) log("✓ Formatted with Biome");
	else log("! Biome not found — skipped formatting");

	// 4. Prove it worked
	const after = analyze({ policy, files: await collectFiles(args.base) });
	log("");
	if (after.status !== "COMPLIANT") {
		log("❌ Remediation did not reach compliance. Nothing was committed.");
		for (const v of after.violations) {
			log(`   ${v.file}:${v.line} [${v.ruleId}] ${v.message}`);
		}
		process.exit(1);
	}
	log(`✓ Re-checked with the analyzer: ${after.status}`);

	// 5. Commit
	const subject = commitSubject(before);
	if (args.commit) {
		log("");
		log("Creating remediation commit...");
		git("add", "--", ...changedFiles);
		if (!git("diff", "--cached", "--name-only")) {
			log("Nothing staged — the files were already compliant on disk.");
			process.exit(0);
		}
		const body = [
			subject,
			"",
			"Applied by the tagging compliance pipeline using TAGGING_RULES.md",
			`as the source of truth (agent: ${agent.displayName}).`,
			"",
			...before.violations.map((v) => `- ${v.ruleId} ${v.file}: ${v.message}`),
		].join("\n");
		git("commit", "-m", body);
		log("");
		log("✓ Commit created:");
		log(`  ${subject}`);
		log(`  ${git("rev-parse", "--short", "HEAD")}`);
	} else {
		log("");
		log(
			"✓ Changes applied to the working tree (pass --commit to commit them):",
		);
		for (const file of changedFiles) log(`  ${file}`);
		log("");
		log(`Suggested commit: ${subject}`);
	}

	if (args.summary && process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(
			process.env.GITHUB_STEP_SUMMARY,
			[
				"## 🤖 Claude Code — Tagging Remediation",
				"",
				`Agent: \`${agent.name}\` (${agent.displayName})`,
				"",
				"```text",
				...transcript,
				"```",
				"",
			].join("\n"),
		);
	}
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(
			process.env.GITHUB_OUTPUT,
			`subject=${subject}\nchanged=${changedFiles.join(" ")}\n`,
		);
	}
}

main().catch((error) => {
	console.error(`Remediation failed: ${error.message}`);
	process.exit(2);
});
