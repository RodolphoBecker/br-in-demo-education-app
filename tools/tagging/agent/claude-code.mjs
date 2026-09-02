/**
 * Layer 5b — Real Claude Code remediation agent.
 *
 * ⚠️  NOT ACTIVE BY DEFAULT, AND NOT EXERCISED BY THIS POC.
 *
 * This module is the seam where a genuine Claude Code run replaces the mock. It
 * shells out to the Claude Code CLI in headless mode and hands it the same two
 * inputs the mock uses: TAGGING_RULES.md and the analyzer's violation report.
 *
 * To use it:
 *   1. install the CLI      npm i -g @anthropic-ai/claude-code
 *   2. export ANTHROPIC_API_KEY (or authenticate the CLI)
 *   3. run with             TAGGING_AGENT=claude bun run tagging:fix
 *
 * In CI, set the repository secret ANTHROPIC_API_KEY and flip TAGGING_AGENT to
 * `claude` in .github/workflows/tagging-remediation.yml.
 */

import { spawnSync } from "node:child_process";
import { RULES_FILE } from "../rules.mjs";

export const name = "claude";
export const displayName = "Claude Code";

export const CLI = process.env.CLAUDE_CODE_BIN || "claude";

/** True when the CLI looks usable on this machine. */
export function isAvailable() {
	const probe = spawnSync(CLI, ["--version"], {
		encoding: "utf8",
		shell: process.platform === "win32",
	});
	return probe.status === 0;
}

/** The instruction Claude Code receives. The rules file is its source of truth. */
export function buildPrompt(result) {
	const findings = result.violations
		.map(
			(v) =>
				`- ${v.file}:${v.line} — [${v.ruleId}] ${v.message} Remedy: ${v.remedy}`,
		)
		.join("\n");

	return [
		`Read ${RULES_FILE}. It is the canonical source of truth for analytics tagging in this repository.`,
		"",
		"The tagging compliance analyzer reported these violations:",
		"",
		findings,
		"",
		"Apply the minimum edits that make every listed file compliant:",
		`- follow the component and prop conventions declared in ${RULES_FILE}`,
		"- reuse the existing abstraction in src/lib/analytics.ts; never call gtag directly",
		"- do not change any visual appearance, class names, copy, or navigation behaviour",
		"- do not refactor anything unrelated to the violations",
		"",
		"Then stop. Do not commit — the workflow creates the commit.",
	].join("\n");
}

/**
 * Same signature and return shape as the mock agent, so callers cannot tell
 * them apart.
 */
export async function remediate({ result, root, log }) {
	if (!isAvailable()) {
		throw new Error(
			`Claude Code CLI ("${CLI}") not found. Install it, or run with TAGGING_AGENT=mock.`,
		);
	}

	const prompt = buildPrompt(result);
	log("");
	log(`Claude Code — Tagging Remediation  (${displayName})`);
	log("");
	log(`$ ${CLI} -p <prompt> --allowedTools Read Edit`);
	log("");

	const run = spawnSync(
		CLI,
		[
			"-p",
			prompt,
			"--allowedTools",
			"Read",
			"Edit",
			"--permission-mode",
			"acceptEdits",
		],
		{
			cwd: root,
			encoding: "utf8",
			shell: process.platform === "win32",
			maxBuffer: 32 * 1024 * 1024,
		},
	);

	if (run.stdout) log(run.stdout.trimEnd());
	if (run.status !== 0) {
		throw new Error(
			`Claude Code exited with status ${run.status}: ${run.stderr?.trim() ?? "no stderr"}`,
		);
	}

	// The agent decides which files to touch; git tells us what actually changed.
	return {
		changedFiles: [...new Set(result.violations.map((v) => v.file))],
		steps: ["Claude Code applied the tagging changes"],
	};
}
