/**
 * Agent selection.
 *
 * `TAGGING_AGENT=mock`   (default) deterministic offline simulation
 * `TAGGING_AGENT=claude`           the real Claude Code CLI
 *
 * Both modules export the same `remediate({ policy, result, root, log })`, so
 * the remediation CLI and the GitHub workflow never branch on which one is in
 * use.
 */

import * as claudeCode from "./claude-code.mjs";
import * as mock from "./mock.mjs";

const AGENTS = { mock, claude: claudeCode };

export function selectAgent(requested = process.env.TAGGING_AGENT) {
	const key = (requested || "mock").toLowerCase();
	const agent = AGENTS[key];
	if (!agent) {
		throw new Error(
			`Unknown TAGGING_AGENT "${requested}". Use one of: ${Object.keys(AGENTS).join(", ")}.`,
		);
	}
	return agent;
}
