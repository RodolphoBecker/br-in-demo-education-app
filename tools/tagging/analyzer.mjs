/**
 * Layer 3 — Compliance analyzer.
 *
 * Applies the rules from TAGGING_RULES.md to the scanner's inventory and
 * produces a violation report plus per-category coverage.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { findRule, formatRuleText, isInScope, REPO_ROOT } from "./rules.mjs";
import { pageNameFromRoute, scanFile, toSnakeCase } from "./scanner.mjs";

const toPosix = (p) => p.split("\\").join("/");

/** Every `.tsx` file under src/app. */
export async function listAllSourceFiles(root = REPO_ROOT) {
	const out = [];
	const walk = async (dir) => {
		for (const entry of await readdir(dir, { withFileTypes: true })) {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) {
				if (entry.name === "node_modules" || entry.name === ".next") continue;
				await walk(full);
			} else if (entry.name.endsWith(".tsx")) {
				out.push(toPosix(relative(root, full)));
			}
		}
	};
	await walk(join(root, "src"));
	return out.sort();
}

/** Files added/changed in the PR, relative to a base ref. */
export function listChangedSourceFiles(baseRef, root = REPO_ROOT) {
	const raw = execFileSync(
		"git",
		["diff", "--name-only", "--diff-filter=ACMR", `${baseRef}...HEAD`],
		{ cwd: root, encoding: "utf8" },
	);
	return raw
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.endsWith(".tsx"))
		.sort();
}

/**
 * Runs the compliance analysis.
 *
 * @param {object} options
 * @param {object} options.policy parsed policy from TAGGING_RULES.md
 * @param {string[]} options.files repo-relative candidate files
 * @param {string} [options.root]
 * @returns {object} the violation report
 */
export function analyze({ policy, files, root = REPO_ROOT }) {
	const inScope = files.filter((file) => isInScope(policy, file));
	const violations = [];
	const warnings = [];
	const counters = {
		page: { total: 0, tagged: 0 },
		link: { total: 0, tagged: 0 },
		button: { total: 0, tagged: 0 },
	};

	for (const file of inScope) {
		let source;
		try {
			source = readFileSync(join(root, file), "utf8");
		} catch {
			continue; // deleted in the PR
		}

		const scan = scanFile(file, source, policy);
		const pageName = scan.pageName ?? pageNameFromRoute("/");

		const add = (ruleId, values, extra = {}) => {
			const rule = findRule(policy, ruleId);
			const entry = {
				ruleId: rule.id,
				level: rule.level,
				category: rule.category,
				title: rule.title,
				event: rule.event ?? null,
				requiredParams: rule.event
					? (policy.events[rule.event]?.requiredParams ?? [])
					: [],
				message: formatRuleText(rule.message, values),
				remedy: formatRuleText(rule.remedy, values),
				file,
				route: scan.route,
				pageName,
				...extra,
			};
			(rule.level === "required" ? violations : warnings).push(entry);
		};

		// PAGE-001
		if (scan.isPage) {
			counters.page.total++;
			if (scan.hasPageAnalytics) counters.page.tagged++;
			else add("PAGE-001", { pageName, route: scan.route }, { line: 1 });
		}

		// LINK-001 / LINK-002
		for (const link of scan.links) {
			if (policy.exempt?.labels?.includes(link.label)) continue;
			counters.link.total++;
			if (!link.tracked) {
				add(
					"LINK-001",
					{ label: link.label || link.href, pageName },
					{ line: link.line, label: link.label, href: link.href },
				);
			} else if (link.missing.length) {
				add(
					"LINK-002",
					{ label: link.label, missingProps: link.missing.join(", ") },
					{ line: link.line, label: link.label, href: link.href },
				);
			} else {
				counters.link.tagged++;
			}
		}

		// BTN-001 / BTN-002
		for (const button of scan.buttons) {
			if (!button.tracked && !button.isPrimary) continue; // optional, not required
			if (policy.exempt?.labels?.includes(button.label)) continue;
			counters.button.total++;
			if (!button.tracked) {
				add(
					"BTN-001",
					{ label: button.label, action: toSnakeCase(button.label), pageName },
					{ line: button.line, label: button.label },
				);
			} else if (button.missing.length) {
				add(
					"BTN-002",
					{ label: button.label, missingProps: button.missing.join(", ") },
					{ line: button.line, label: button.label },
				);
			} else {
				counters.button.tagged++;
			}
		}

		// ABS-001
		if (scan.usesGtagDirectly) add("ABS-001", {}, { line: 1 });
	}

	const coverage = {};
	for (const [category, { total, tagged }] of Object.entries(counters)) {
		coverage[category] = {
			total,
			tagged,
			percent: total === 0 ? 100 : Math.round((tagged / total) * 100),
			required: policy.coverage[category] ?? 100,
		};
	}

	const coverageFailures = Object.entries(coverage)
		.filter(([, c]) => c.total > 0 && c.percent < c.required)
		.map(([category, c]) => ({ category, ...c }));

	return {
		status: violations.length ? "NON_COMPLIANT" : "COMPLIANT",
		filesAnalyzed: inScope,
		violations,
		warnings,
		coverage,
		coverageFailures,
		newPages: [
			...new Set(violations.filter((v) => v.route).map((v) => v.route)),
		],
	};
}
