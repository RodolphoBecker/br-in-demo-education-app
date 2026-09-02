/**
 * The pages the demo can stage an untagged "before" state for.
 *
 * `demo-strip.mjs` generates a fixture from the real page; `demo-reset.mjs`
 * copies the fixture back over it. The home page is the primary scenario.
 */

export const DEMO_TARGETS = {
	home: {
		page: "src/app/page.tsx",
		fixture: "demo/home-page.untagged.tsx",
		route: "/",
		banner: `// DEMO FIXTURE — the "before" state of the tagging compliance demo.
//
// The FTD Educação home page exactly as it appears in src/app/page.tsx, with
// one difference: every piece of analytics tagging has been removed. No
// <PageAnalytics>, plain <Link> instead of <TrackedLink>, plain <button>
// instead of <TrackedButton>, and none of the tracking props.
//
// It stands in for a pull request that reworks the home page and forgets the
// tagging. \`bun run tagging:check\` reports one violation per untracked
// element; \`bun run tagging:fix\` puts the tagging back.
//
// Regenerate with \`bun run demo:strip\`; stage with \`bun run demo:reset\`.`,
	},

	reports: {
		page: "src/app/reports/page.tsx",
		fixture: "demo/reports-page.untagged.tsx",
		route: "/reports",
		banner: `// DEMO FIXTURE — a smaller "before" state for the tagging compliance demo.
//
// The /reports page with its analytics tagging removed: no <PageAnalytics>, a
// plain <Link> and a plain <button>. Four violations instead of the home page's
// twenty-two, for a shorter walkthrough.
//
// Regenerate with \`bun run demo:strip reports\`; stage with
// \`bun run demo:reset reports\`.`,
	},
};
