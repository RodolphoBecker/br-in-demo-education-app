/**
 * Layer 4 — Violation report rendering.
 *
 * One analysis result, three audiences: the developer's terminal, the GitHub
 * Actions job summary, and the pull request comment.
 */

const BADGE =
	"https://img.shields.io/badge/%F0%9F%A4%96%20Fix%20it%20for%20me-Run%20the%20Claude%20Code%20agent-2ea44f?style=for-the-badge";

const groupByFile = (violations) => {
	const groups = new Map();
	for (const v of violations) {
		if (!groups.has(v.file)) groups.set(v.file, []);
		groups.get(v.file).push(v);
	}
	return groups;
};

const plainMessage = (v) =>
	({
		"PAGE-001": "Page analytics configuration",
		"LINK-001": `Click tracking for the "${v.label || v.href}" link`,
		"LINK-002": `Complete click tracking for the "${v.label}" link`,
		"BTN-001": `Click tracking for the "${v.label}" button`,
		"BTN-002": `Complete click tracking for the "${v.label}" button`,
		"ABS-001": "Use of the shared analytics helper",
	})[v.ruleId] ?? v.message;

/** Human-facing summary of the required events, for the report body. */
function requiredEvents(result) {
	const events = new Map();
	for (const v of result.violations) {
		if (v.event && !events.has(v.event)) events.set(v.event, v.requiredParams);
	}
	return [...events.entries()];
}

/** Terminal output. */
export function renderConsole(result) {
	const lines = [];
	const rule = "─".repeat(64);

	lines.push("");
	lines.push("  Tagging Compliance Check");
	lines.push(`  ${rule}`);

	if (result.status === "COMPLIANT") {
		lines.push("");
		lines.push("  ✓ PASSED");
		lines.push("");
		lines.push(
			`  ${result.filesAnalyzed.length} file(s) analyzed. Every new page, link and`,
		);
		lines.push("  button meets the minimum analytics tagging requirements.");
		lines.push("");
		lines.push(`  ${rule}`);
		lines.push(renderCoverageLine(result));
		lines.push("");
		return lines.join("\n");
	}

	lines.push("");
	lines.push("  ❌ FAILED");
	lines.push("");

	for (const [file, violations] of groupByFile(result.violations)) {
		const route = violations.find((v) => v.route)?.route;
		lines.push(
			route
				? `  The page "${route}" does not meet the minimum analytics`
				: `  ${file} does not meet the minimum analytics`,
		);
		lines.push("  tagging requirements.");
		lines.push("");
		lines.push(`  File: ${file}`);
		lines.push("");
		lines.push("  Missing:");
		for (const v of violations) {
			lines.push(`    - ${plainMessage(v)}  (${v.ruleId}, line ${v.line})`);
		}
		lines.push("");
	}

	for (const [event, params] of requiredEvents(result)) {
		lines.push(`  Required event:`);
		lines.push(`    ${event}`);
		lines.push(`  Required parameters:`);
		for (const p of params) lines.push(`    - ${p}`);
		lines.push("");
	}

	lines.push(`  ${rule}`);
	lines.push(renderCoverageLine(result));
	lines.push("");
	lines.push("  Fix it for me:  bun run tagging:fix");
	lines.push("  Rules:          TAGGING_RULES.md");
	lines.push("");

	return lines.join("\n");
}

function renderCoverageLine(result) {
	const parts = Object.entries(result.coverage)
		.filter(([, c]) => c.total > 0)
		.map(
			([category, c]) =>
				`${category}s ${c.tagged}/${c.total} (${c.percent}%, need ${c.required}%)`,
		);
	return `  Coverage: ${parts.length ? parts.join("  ·  ") : "nothing to check"}`;
}

/**
 * GitHub Actions job summary / PR comment.
 *
 * @param {object} result analysis result
 * @param {object} ctx { fixUrl, runUrl, commentCommand, forComment }
 */
export function renderMarkdown(result, ctx = {}) {
	const md = [];
	const compliant = result.status === "COMPLIANT";

	md.push(
		compliant
			? "## ✅ Analytics Tagging Compliance"
			: "## ❌ Analytics Tagging Compliance",
	);
	md.push("");

	if (compliant) {
		md.push(
			result.filesAnalyzed.length === 0
				? "No pages, links or buttons changed in this pull request — nothing to check."
				: "**Required tagging implemented.** Every new page, link and button follows [`TAGGING_RULES.md`](../blob/HEAD/TAGGING_RULES.md).",
		);
		md.push("");
		md.push(renderCoverageTable(result));
		if (result.warnings.length) md.push(renderWarnings(result));
		return md.join("\n");
	}

	const pages = [
		...new Set(result.violations.filter((v) => v.route).map((v) => v.route)),
	];
	if (pages.length) {
		md.push(`> **New page detected: \`${pages.join("`, `")}\`**`);
		md.push(">");
		md.push("> This page does not meet the minimum tagging requirements.");
		md.push("");
	} else {
		md.push("This change does not meet the minimum tagging requirements.");
		md.push("");
	}

	md.push("### Missing");
	md.push("");
	for (const [file, violations] of groupByFile(result.violations)) {
		md.push(`**\`${file}\`**`);
		md.push("");
		md.push("| | What is missing | Rule | Line |");
		md.push("| --- | --- | --- | --- |");
		for (const v of violations) {
			md.push(`| • | ${plainMessage(v)} | \`${v.ruleId}\` | ${v.line} |`);
		}
		md.push("");
	}

	const events = requiredEvents(result);
	if (events.length) {
		md.push("### Required events");
		md.push("");
		md.push("| Event | Required parameters |");
		md.push("| --- | --- |");
		for (const [event, params] of events) {
			md.push(`| \`${event}\` | ${params.map((p) => `\`${p}\``).join(", ")} |`);
		}
		md.push("");
	}

	md.push(renderCoverageTable(result));
	if (result.warnings.length) md.push(renderWarnings(result));

	md.push("---");
	md.push("");
	if (ctx.fixUrl) {
		md.push(`[![Fix it for me](${BADGE})](${ctx.fixUrl})`);
		md.push("");
		md.push(
			`Runs the Claude Code remediation agent against this branch. It reads [\`TAGGING_RULES.md\`](../blob/HEAD/TAGGING_RULES.md), applies the missing tagging and pushes a commit.`,
		);
	}
	if (ctx.commentCommand) {
		md.push("");
		md.push(
			`You can also comment \`${ctx.commentCommand}\` on this pull request, or run \`bun run tagging:fix\` locally.`,
		);
	}

	return md.join("\n");
}

function renderCoverageTable(result) {
	const rows = Object.entries(result.coverage).filter(([, c]) => c.total > 0);
	if (!rows.length) return "";

	const md = ["<details><summary>Tagging coverage</summary>", ""];
	md.push("| Category | Tagged | Total | Coverage | Minimum |");
	md.push("| --- | ---: | ---: | ---: | ---: |");
	for (const [category, c] of rows) {
		const icon = c.percent >= c.required ? "✅" : "❌";
		md.push(
			`| ${category} | ${c.tagged} | ${c.total} | ${icon} ${c.percent}% | ${c.required}% |`,
		);
	}
	md.push("");
	md.push("</details>");
	md.push("");
	return md.join("\n");
}

function renderWarnings(result) {
	const md = [
		"<details><summary>Recommendations (do not fail the build)</summary>",
		"",
	];
	for (const w of result.warnings) {
		md.push(`- \`${w.ruleId}\` ${w.message} — ${w.remedy}`);
	}
	md.push("");
	md.push("</details>");
	md.push("");
	return md.join("\n");
}
