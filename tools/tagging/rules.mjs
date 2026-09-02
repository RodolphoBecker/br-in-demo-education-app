/**
 * Layer 1 — Tagging rules.
 *
 * Loads the machine-readable policy embedded in TAGGING_RULES.md. That file is
 * the only source of truth: nothing in this pipeline hardcodes a rule.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
);

export const RULES_FILE = "TAGGING_RULES.md";

/**
 * Reads a source file, normalised to LF line endings.
 *
 * Git can hand out CRLF files (`core.autocrlf=true` on Windows) and every
 * pattern in this pipeline matches on a bare newline, so normalise once, here.
 * `.gitattributes` pins the checkout to LF as well; this is the belt to that
 * pair of braces.
 */
export function readSource(path) {
	return readFileSync(path, "utf8").replaceAll("\r\n", "\n");
}

/** Fenced block that carries the policy, i.e. ```json tagging-policy */
const POLICY_BLOCK = /```json\s+tagging-policy\s*\n([\s\S]*?)\n```/;

/**
 * Reads TAGGING_RULES.md and returns the parsed policy.
 *
 * @param {string} [root] repository root
 * @returns {{policy: object, rulesPath: string, markdown: string}}
 */
export function loadPolicy(root = REPO_ROOT) {
	const rulesPath = join(root, RULES_FILE);

	let markdown;
	try {
		markdown = readSource(rulesPath);
	} catch {
		throw new Error(
			`${RULES_FILE} not found at ${rulesPath}. The tagging pipeline cannot run without it.`,
		);
	}

	const match = POLICY_BLOCK.exec(markdown);
	if (!match?.[1]) {
		throw new Error(
			`${RULES_FILE} has no \`\`\`json tagging-policy block. Add one so the analyzer knows the rules.`,
		);
	}

	let policy;
	try {
		policy = JSON.parse(match[1]);
	} catch (error) {
		throw new Error(
			`The tagging-policy block in ${RULES_FILE} is not valid JSON: ${error.message}`,
		);
	}

	return { policy, rulesPath, markdown };
}

/** Looks a rule up by id, e.g. "LINK-001". */
export function findRule(policy, id) {
	const rule = policy.rules.find((r) => r.id === id);
	if (!rule) throw new Error(`Rule ${id} is not defined in ${RULES_FILE}.`);
	return rule;
}

/** Fills `{placeholders}` in a rule message or remedy. */
export function formatRuleText(text, values) {
	return text.replace(/\{(\w+)\}/g, (whole, key) =>
		values[key] === undefined ? whole : String(values[key]),
	);
}

/**
 * True when `filePath` (repo-relative, POSIX separators) is in scope.
 * Supports the small glob subset the policy uses: `**` and `*`.
 */
export function isInScope(policy, filePath) {
	const matches = (pattern) => globToRegExp(pattern).test(filePath);
	if (policy.exempt?.paths?.some(matches)) return false;
	if (policy.scope.exclude?.some(matches)) return false;
	return policy.scope.include.some(matches);
}

const GLOB_TOKEN = /\*\*\/|\*\*|\*|[^*]+/g;

function globToRegExp(pattern) {
	let source = "";
	for (const [token] of pattern.matchAll(GLOB_TOKEN)) {
		if (token === "**/") source += "(?:.*/)?";
		else if (token === "**") source += ".*";
		else if (token === "*") source += "[^/]*";
		else source += token.replace(/[.+^${}()|[\]?]/g, (char) => `\\${char}`);
	}
	return new RegExp(`^${source}$`);
}
