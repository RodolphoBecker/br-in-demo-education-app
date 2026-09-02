# Analytics Tagging Compliance — CI/CD POC

A demo of an intelligent CI/CD stage: when a pull request touches a page, link
or button, the pipeline checks it against the repository's analytics tagging
rules and offers a **"Fix it for me"** action that hands the violation to an
agent, which applies the tagging and pushes a commit.

The demo target is the **FTD Educação home page** (`src/app/page.tsx`, route
`/`) — the same page the app actually serves.

```
                       TAGGING_RULES.md
                              │  (single source of truth)
                              ▼
Pull Request ──▶ CI/CD ──▶ Diff analysis ──▶ Compliance check
                                                   │
                        ┌──────────────────────────┴───────────────────────┐
                        ▼                                                  ▼
                   COMPLIANT                                        NON_COMPLIANT
                        │                                                  │
                   pipeline continues                    job summary + PR comment
                                                          + [ Fix it for me ]
                                                                           │
                                                                           ▼
                                                         Claude Code remediation agent
                                                                           │
                                     reads TAGGING_RULES.md ──▶ analyzes the violation
                                     ──▶ modifies the application ──▶ re-validates
                                     ──▶ commits ──▶ CI re-runs ──▶ ✅ COMPLIANT
```

## Architecture

Each layer is a separate module, so any one of them can be replaced without
touching the others.

| Layer | Lives in | Responsibility |
| --- | --- | --- |
| 1. Tagging rules | `TAGGING_RULES.md` | The rules, in prose plus a machine-readable ` ```json tagging-policy ` block. Nothing else defines a rule. |
| 2. Rules loader | `tools/tagging/rules.mjs` | Parses the policy block; scope globbing; message templating; LF-normalised reads. |
| 3. Scanner | `tools/tagging/scanner.mjs` | Turns a `.tsx` file into an inventory of pages, links and buttons, each with its label, section and loop context. |
| 4. Analyzer | `tools/tagging/analyzer.mjs` | Applies the rules, computes coverage, returns `COMPLIANT` / `NON_COMPLIANT`. |
| 5. Report | `tools/tagging/report.mjs` | Renders the result for the terminal, the job summary and the PR comment. |
| 6. Remediation | `tools/tagging/codemods.mjs`, `tools/tagging/agent/` | Applies the tagging; the agent layer decides *who* applies it. |
| 7. Orchestration | `.github/workflows/` | Triggers, permissions, commit and push. |

Entry points:

```bash
bun run tagging:check   # analyze; exit 1 when NON_COMPLIANT
bun run tagging:fix     # "Fix it for me": apply the missing tagging
bun run demo:reset      # stage the demo's "before" state (home page)
bun run demo:strip      # regenerate the fixture from the current page
```

Useful flags: `--base <ref>` (analyze only what a PR changed), `--commit`,
`--summary`, `--markdown <file>`, `--json <file>`, `--soft`.

## How the rules work

`TAGGING_RULES.md` carries a JSON policy block declaring the scope, the
component conventions, the required events and their parameters, the rules, and
the minimum coverage per category. The analyzer and the agent both read that one
block, so editing the Markdown changes the behaviour of the pipeline — there is
no second copy of the rules.

Current rules: `PAGE-001`, `LINK-001`, `LINK-002`, `BTN-001`, `BTN-002`,
`ABS-001`. Minimum coverage: 100% for pages, navigation links and buttons.

`BTN-001` requires **every** `<button>` to be tracked. A button opts out
explicitly with `aria-hidden="true"` or `data-analytics="ignore"` — a deliberate
choice over the old "only if it has an `onClick`" heuristic, which silently
skipped buttons whose behaviour lives in a parent or a server action.

## How the compliance check works

1. Collect candidate files — the PR diff (`--base`) or the whole app.
2. Drop anything out of scope (`src/app/_components/**`, `layout.tsx`).
3. Scan each file for its page identity, links and buttons.
4. Apply every rule; `required` violations fail, `optional` ones warn.
5. Compute coverage per category and render the report, grouped by the page
   section that renders each element.

The scanner is a lexical pass, not a type-aware AST analysis — enough for this
repository's conventions and dependency-free. Two details it does get right,
because both produced real bugs during development:

- **`page_view` placement.** `PAGE-001` is satisfied only when
  `<PageAnalytics />` is rendered by the file's *default-exported* page
  component. A route file also declares helper components, and a marker dropped
  into one of those (`Triangle`, rendered 43 times on the home page) would fire
  43 page views while a file-wide "is it present?" check called it compliant.
- **`link_position` in loops.** Inside a `.map()` the position must be the loop
  index. When the callback exposes no index, the prop is omitted rather than
  written as a constant, which would claim every item in the list sits in the
  same place.

## How the remediation works

`tools/tagging/agent/` picks the agent from `TAGGING_AGENT`:

| Value | Module | What it does |
| --- | --- | --- |
| `mock` (default) | `agent/mock.mjs` | **Simulation.** A deterministic, offline codemod runner whose transcript is shaped like an agent's. It is not an AI. |
| `claude` | `agent/claude-code.mjs` | **Real Claude Code.** Shells out to the `claude` CLI in headless mode with a prompt built from `TAGGING_RULES.md` and the analyzer's findings. |

Both export the same `remediate({ policy, result, root, log })`, so the CLI and
the workflow never branch on which one is running.

What the codemods infer, and how:

| Prop | Source |
| --- | --- |
| `trackingLabel` | the element's visible text; the heading for card-style links; a JSX expression (`{item.label}`) when the text comes from a variable; a template (`` {`Soluções ${solution.label}`} ``) for mixed content; then `aria-label`, then the single child component's name, then the `href` |
| `trackingSource` | the enclosing component, as `snake_case` — `SiteHeader` → `site_header`, `HeroSection` → `hero` |
| `trackingPosition` | the loop's index binding inside a `.map()`; otherwise the element's ordinal within its section |
| `trackingAction` | `snake_case` of the button's label; the section name when the label is dynamic |
| `pageName` | the route — `/` → `home`, `/reports/monthly` → `reports_monthly` |

After the agent edits the files, `tools/tagging/remediate.mjs`:

1. formats the result with the repository's own Biome config,
2. **re-runs the analyzer** — if the result is still `NON_COMPLIANT`, nothing is
   committed and the run exits non-zero,
3. creates the commit, e.g. `feat(analytics): add tagging to Home page`.

### Switching to the real Claude Code agent

```bash
npm install -g @anthropic-ai/claude-code
export ANTHROPIC_API_KEY=...
TAGGING_AGENT=claude bun run tagging:fix
```

In CI: add the `ANTHROPIC_API_KEY` repository secret and choose `claude` in the
remediation workflow's `agent` input.

## The workflows

**`.github/workflows/tagging-compliance.yml`** — on every pull request:
analyzes the diff against the base branch, writes a **job summary**, posts a
single sticky **PR comment** carrying the "Fix it for me" button, uploads the
report as an artifact, and fails the job when a required rule is violated.

**`.github/workflows/tagging-remediation.yml`** — the "Fix it for me" action.
Triggered by the button (`workflow_dispatch`, optionally with a PR number) or by
commenting `/fix-tagging` on a pull request. It checks out the PR branch, runs
the agent, validates with `check` + `typecheck` + `build`, pushes the commit and
comments the result. The compliance check then re-runs on the new commit and
turns green.

## Running the demo

The committed repository is **compliant** — `bun run tagging:check` passes. The
"before" state is staged on demand, so the app in `main` is never left untagged.

### Locally (about a minute, no GitHub needed)

```bash
bun run tagging:check   # ✓ PASSED — the committed home page is tagged

bun run demo:reset      # stage the PR: the home page loses its tagging
bun run tagging:check   # ❌ FAILED — 22 violations across 10 sections of /
bun run tagging:fix     # 🤖 agent transcript, then COMPLIANT
git diff                # the tagging changes, and nothing else

git checkout src/app/page.tsx   # back to the committed state
```

### On GitHub (the full experience)

```bash
git checkout -b feat/home-rework
bun run demo:reset
git commit -am "feat(home): rework the FTD home page"
git push -u origin feat/home-rework
gh pr create --fill
```

1. **Tagging Compliance** runs and fails.
2. The PR shows the ❌ comment: *Untagged page detected: `/`*, the missing items
   grouped by section, the required events, and the **Fix it for me** button.
3. Click the button (or comment `/fix-tagging`).
4. **Tagging Remediation** runs; the job summary shows the agent transcript.
5. A commit lands on the branch: `feat(analytics): add tagging to Home page`
   (~122 insertions, tagging only).
6. **Tagging Compliance** re-runs on the new commit and passes ✅.

### The shorter scenario

`/reports` is a second, smaller target — 4 violations instead of 22, for a
walkthrough that fits in a couple of minutes:

```bash
bun run demo:reset reports
bun run tagging:check
bun run tagging:fix
```

### What the fix produces

```diff
-import Link from "next/link";
+import { PageAnalytics } from "~/app/_components/page-analytics";
+import { TrackedButton } from "~/app/_components/tracked-button";
+import { TrackedLink } from "~/app/_components/tracked-link";

 export default function HomePage() {
     <main className="overflow-x-hidden bg-white">
+      <PageAnalytics pageName="home" />

       {NAV_ITEMS.map((item) => (
-        <Link
+        <TrackedLink
           className="flex items-center gap-1.5 …"
           href="#"
           key={item.label}
+          trackingLabel={item.label}
+          trackingSource="site_header"
         >
```

No class names, copy, layout or navigation behaviour change — only tagging.

### Keeping the fixture in sync

`demo/home-page.untagged.tsx` is generated from the real page, not maintained by
hand. After editing `src/app/page.tsx`, regenerate it:

```bash
bun run demo:strip          # home page
bun run demo:strip reports  # the /reports scenario
bun run check:write
```

`tools/tagging/demo-strip.mjs` removes the tagging components and props, gives
every bare `<button>` the explicit `type` that `<TrackedButton>` renders, and
tidies up what the removal orphans (unused loop indices, an unused `offset`
prop) so the fixture is lint-clean.

## What is real and what is simulated

**Fully implemented**

- `TAGGING_RULES.md` as the single source of truth, parsed at runtime.
- The scanner, analyzer, coverage model and reports.
- The codemods: they produce real, formatted, type-checking code, including
  expression-valued props inside `.map()` loops.
- The self-validation step (re-analyze before committing).
- Both GitHub Actions workflows, the job summary, the sticky PR comment, the
  "Fix it for me" button and the `/fix-tagging` comment trigger.

**Simulated**

- The default remediation agent (`mock`) is a scripted codemod runner, not an
  AI. Its transcript is styled like an agent's for the demo. It is labelled
  "Claude Code (simulated)" everywhere it prints.

**Ready for a real integration**

- `agent/claude-code.mjs` is the seam: same interface, builds the prompt from
  `TAGGING_RULES.md` plus the findings, shells out to the `claude` CLI. It is
  wired into the workflow behind `TAGGING_AGENT=claude` but has **not been
  exercised** in this repository — no API key was used and no real Claude Code
  run has been performed here.

## Known limitations

- The scanner is lexical. A link or button produced by indirection — a wrapper
  component, or an element rendered from another file — is not detected. Labels
  come from the JSX at hand, so a link whose only child is a component
  (`<Wordmark />`) is named after that component rather than the words a user
  reads; a human refines those.
- `trackingSource` is derived from the enclosing component, so a link inside a
  helper such as `FooterColumn` reports `footer_column`, not `site_footer`.
- The remediation codemods target the conventions in this repository; unusual
  JSX shapes may be left for a human — which the re-validation step surfaces
  rather than committing a bad fix.
- The remediation workflow pushes to the PR branch, so it works for same-repo
  pull requests, not forks.
- `.gitattributes` pins the checkout to LF because the codemods match on `\n`;
  the tools also normalise on read, so a CRLF working tree still works.
