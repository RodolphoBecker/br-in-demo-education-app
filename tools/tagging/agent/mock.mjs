/**
 * Layer 5b — Mock remediation agent (the default).
 *
 * Stands in for a real Claude Code run. It performs the same job deterministically
 * and offline: read TAGGING_RULES.md, look at the violations the analyzer found,
 * apply the tagging, report what it did.
 *
 * It is NOT an AI. It is a scripted codemod runner whose transcript is shaped
 * like an agent's so the demo reads clearly. See `claude-code.mjs` for the seam
 * where a real Claude Code invocation goes.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	addMissingProps,
	addPageAnalytics,
	trackButton,
	trackLink,
} from "../codemods.mjs";
import { RULES_FILE, readSource } from "../rules.mjs";
import { scanFile, toSnakeCase } from "../scanner.mjs";

export const name = "mock";
export const displayName = "Claude Code (simulated)";

/**
 * @param {object} options
 * @param {object} options.policy parsed policy
 * @param {object} options.result analysis result
 * @param {string} options.root repo root
 * @param {(line: string) => void} options.log transcript sink
 * @returns {{changedFiles: string[], steps: string[]}}
 */
export async function remediate({ policy, result, root, log }) {
	const steps = [];
	const step = (text) => {
		steps.push(text);
		log(`✓ ${text}`);
	};

	log("");
	log(`Claude Code — Tagging Remediation  (${displayName})`);
	log("");
	log("Analyzing repository tagging rules...");
	log("");

	step(
		`Read ${RULES_FILE} (${policy.rules.length} rules, policy v${policy.version})`,
	);

	const byFile = new Map();
	for (const violation of result.violations) {
		if (!byFile.has(violation.file)) byFile.set(violation.file, []);
		byFile.get(violation.file).push(violation);
	}

	const changedFiles = [];

	for (const [file, violations] of byFile) {
		const route = violations.find((v) => v.route)?.route;
		step(
			route
				? `Identified affected page: ${route}  (${file})`
				: `Identified affected file: ${file}`,
		);
		step(
			`Identified ${violations.length} missing instrumentation point(s): ${violations
				.map((v) => v.ruleId)
				.join(", ")}`,
		);

		const absolute = join(root, file);
		let source = readSource(absolute);
		const pageName = violations[0].pageName;

		// PAGE-001 first: it only inserts a child, so element offsets stay valid
		// for the scans that follow.
		if (violations.some((v) => v.ruleId === "PAGE-001")) {
			source = addPageAnalytics(source, { policy, pageName });
			step(`Applied required page tracking (page_view) to ${route ?? file}`);
		}

		// Re-scan between each edit: every transform shifts offsets.
		let guard = 0;
		for (;;) {
			if (guard++ > 50) break;
			const scan = scanFile(file, source, policy);

			const untrackedLink = scan.links.find((l) => !l.tracked);
			if (untrackedLink) {
				// Ordinal within its own section, so positions stay meaningful
				// when a page has several groups of links.
				const position = scan.links.filter(
					(l) => l.tracked && l.source === untrackedLink.source,
				).length;
				source = trackLink(source, {
					policy,
					element: untrackedLink,
					pageName,
					position,
				});
				step(
					`Applied link_click tracking to "${untrackedLink.label}" -> ${untrackedLink.href}`,
				);
				continue;
			}

			const untrackedButton = scan.buttons.find(
				(b) => !b.tracked && b.required,
			);
			if (untrackedButton) {
				source = trackButton(source, {
					policy,
					element: untrackedButton,
					pageName,
				});
				step(
					`Applied button_click tracking to "${untrackedButton.label}" (action: ${toSnakeCase(untrackedButton.label)})`,
				);
				continue;
			}

			const incomplete = [...scan.links, ...scan.buttons].find(
				(el) => el.tracked && el.missing.length,
			);
			if (incomplete) {
				source = addMissingProps(source, {
					element: incomplete,
					values: {
						trackingLabel: incomplete.label,
						trackingSource: pageName,
						trackingAction: toSnakeCase(incomplete.label),
						href: incomplete.href,
					},
				});
				step(
					`Added required event parameters to "${incomplete.label}": ${incomplete.missing.join(", ")}`,
				);
				continue;
			}

			break;
		}

		writeFileSync(absolute, source);
		changedFiles.push(file);
	}

	if (changedFiles.length) {
		step(
			`Added required event parameters from ${RULES_FILE}: link_text, link_destination, button_action, button_label, page_name, page_path`,
		);
	}

	return { changedFiles, steps };
}
