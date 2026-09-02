# Analytics Tagging Compliance — CI/CD POC

A demo of an intelligent CI/CD stage: when a pull request adds a page, link or
button, the pipeline checks it against the repository's analytics tagging rules
and offers a **"Fix it for me"** action that hands the violation to an agent,
which applies the tagging and pushes a commit.

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
| 2. Rules loader | `tools/tagging/rules.mjs` | Parses the policy block; scope globbing; message templating. |
| 3. Scanner | `tools/tagging/scanner.mjs` | Turns a `.tsx` file into an inventory of pages, links and buttons. |
| 4. Analyzer | `tools/tagging/analyzer.mjs` | Applies the rules, computes coverage, returns `COMPLIANT` / `NON_COMPLIANT`. |
| 5. Report | `tools/tagging/report.mjs` | Renders the result for the terminal, the job summary and the PR comment. |
| 6. Remediation | `tools/tagging/codemods.mjs`, `tools/tagging/agent/` | Applies the tagging; the agent layer decides *who* applies it. |
| 7. Orchestration | `.github/workflows/` | Triggers, permissions, commit and push. |

Entry points:

```bash
bun run tagging:check   # analyze; exit 1 when NON_COMPLIANT
bun run tagging:fix     # "Fix it for me": apply the tagging
bun run demo:reset      # restore the demo's "before" state
```

Useful flags: `--base <ref>` (analyze only what a PR changed), `--commit`,
`--summary`, `--markdown <file>`, `--json <file>`, `--soft`.

## How the rules work

`TAGGING_RULES.md` carries a JSON policy block that declares the scope, the
component conventions, the required events and their parameters, the rules
themselves, and the minimum coverage per category. The analyzer and the agent
both read that one block, so editing the Markdown changes the behaviour of the
pipeline — there is no second copy of the rules.

Current rules: `PAGE-001`, `LINK-001`, `LINK-002`, `BTN-001`, `BTN-002`,
`ABS-001`. Minimum coverage: 100% for new pages, navigation links and primary
buttons.

## How the compliance check works

1. Collect candidate files — the PR diff (`--base`) or the whole app.
2. Drop anything out of scope (`src/app/_components/**`, `layout.tsx`).
3. Scan each file for its page identity, links and buttons.
4. Apply every rule; `required` violations fail, `optional` ones warn.
5. Compute coverage per category and render the report.

The scanner is a lexical pass, not a type-aware AST analysis — enough for this
repository's conventions and dependency-free. Replacing it with a real AST
visitor would not change any other layer.

## How the remediation works

`tools/tagging/agent/` picks the agent from `TAGGING_AGENT`:

| Value | Module | What it does |
| --- | --- | --- |
| `mock` (default) | `agent/mock.mjs` | **Simulation.** A deterministic, offline codemod runner whose transcript is shaped like an agent's. It is not an AI. |
| `claude` | `agent/claude-code.mjs` | **Real Claude Code.** Shells out to the `claude` CLI in headless mode with a prompt built from `TAGGING_RULES.md` and the analyzer's findings. |

Both export the same `remediate({ policy, result, root, log })`, so the CLI and
the workflow never branch on which one is running.

After the agent edits the files, `tools/tagging/remediate.mjs`:

1. formats the result with the repository's own Biome config,
2. **re-runs the analyzer** — if the result is still `NON_COMPLIANT`, nothing is
   committed and the run exits non-zero,
3. creates the commit, e.g. `feat(analytics): add tagging to Reports page`.

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

The repository ships with `/reports` intentionally **untagged** — that is the
"before" state.

### Locally (30 seconds, no GitHub needed)

```bash
bun run tagging:check   # ❌ FAILED — 4 violations on /reports
bun run tagging:fix     # 🤖 agent transcript, then COMPLIANT
git diff                # the tagging changes
bun run demo:reset      # back to the "before" state
```

### On GitHub (the full experience)

```bash
git checkout -b feat/reports-page
bun run demo:reset
git add src/app/reports && git commit -m "feat: add reports page"
git push -u origin feat/reports-page
gh pr create --fill
```

1. **Tagging Compliance** runs and fails.
2. The PR shows the ❌ comment: *New page detected: `/reports`* with the missing
   items and the **Fix it for me** button.
3. Click the button (or comment `/fix-tagging`).
4. **Tagging Remediation** runs; the job summary shows the agent transcript.
5. A commit lands on the branch: `feat(analytics): add tagging to Reports page`.
   The diff shows `<PageAnalytics>`, `<TrackedLink>` and `<TrackedButton>` being
   added — and nothing else.
6. **Tagging Compliance** re-runs on the new commit and passes ✅.

### What the fix produces

```diff
-import Link from "next/link";
+import { PageAnalytics } from "~/app/_components/page-analytics";
+import { TrackedButton } from "~/app/_components/tracked-button";
+import { TrackedLink } from "~/app/_components/tracked-link";

       <main className="…">
+       <PageAnalytics pageName="reports" />
-         <Link
+         <TrackedLink
             href="/reports/monthly"
+            trackingLabel="View Report"
+            trackingPosition={0}
+            trackingSource="reports"
```

No class names, copy, layout or navigation behaviour change — only tagging.

## What is real and what is simulated

**Fully implemented**

- `TAGGING_RULES.md` as the single source of truth, parsed at runtime.
- The scanner, analyzer, coverage model and reports.
- The codemods: they produce real, formatted, type-checking code.
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

- The scanner is lexical. Links and buttons produced by indirection (a `map`
  over data, a wrapper component, a component from another file) are not
  detected.
- The remediation codemods target the conventions in this repository; unusual
  JSX shapes may be left for a human — which the re-validation step surfaces
  rather than committing a bad fix.
- The remediation workflow pushes to the PR branch, so it works for same-repo
  pull requests, not forks.
- `bun run tagging:check` on a fresh clone reports `NON_COMPLIANT` **by design**
  — that is the demo's starting point.
