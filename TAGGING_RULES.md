# Analytics Tagging Rules

Canonical source of truth for Google Analytics tagging in this repository.

This document is read by **both** halves of the tagging compliance pipeline:

- the **compliance analyzer** (`tools/tagging/`) parses the policy block at the
  bottom of this file to decide `COMPLIANT` / `NON_COMPLIANT`;
- the **remediation agent** (Claude Code, see `tools/tagging/agent/`) reads this
  document to learn what tagging to add.

Changing a rule here changes the behaviour of the pipeline. There is no second
copy of the rules anywhere else.

---

## 1. Principles

1. **Components never touch `gtag` directly.** All tracking goes through the
   shared abstraction in `src/lib/analytics.ts`.
2. **Tagging is declarative.** A developer adds a component or a prop, not an
   event payload.
3. **Tagging never changes behaviour.** No `preventDefault`, no delays, no
   visible UI.
4. **Missing configuration is not a failure.** With no
   `NEXT_PUBLIC_GA_MEASUREMENT_ID`, every tracking call is a no-op and the app
   works normally.

## 2. The shared abstraction

| Concern | Use | Emits |
| --- | --- | --- |
| Page view | `<PageAnalytics pageName="…" />` | `page_view` |
| Navigation link | `<TrackedLink trackingLabel="…" trackingSource="…" href="…">` | `link_click` |
| Interactive button | `<TrackedButton trackingAction="…" trackingLabel="…" trackingSource="…">` | `button_click` |
| Anything else | `trackEvent(name, params)` from `~/lib/analytics` | custom |

---

## 3. Rules

### PAGE-001 — Every page reports a page view · **required**

Every route entry point (`src/app/**/page.tsx`) must render
`<PageAnalytics pageName="…" />`.

`pageName` must be a stable `snake_case` identifier derived from the route
(`/` becomes `home`, `/reports` becomes `reports`, `/reports/monthly` becomes
`reports_monthly`).

> **Why:** `gtag('config')` runs with `send_page_view: false`, so the App Router
> would otherwise report **zero** page views on client-side navigation.

```tsx
// src/app/reports/page.tsx
<main>
  <PageAnalytics pageName="reports" />
  …
</main>
```

### LINK-001 — Every navigation link emits `link_click` · **required**

Inside `src/app/**`, the `<Link>` from `next/link` and raw `<a href>` are not
allowed for user-facing navigation. Use `<TrackedLink>`.

### LINK-002 — Link events carry text and destination · **required**

Every `<TrackedLink>` must set `trackingLabel` (the visible text) and `href`
(the destination). `trackingSource` and `trackingPosition` are recommended.

`trackingLabel` may be a literal (`trackingLabel="Lumisfera"`), an expression
(`trackingLabel={item.label}`) or a template
(``trackingLabel={`Soluções ${solution.label}`}``) — whatever reflects the text
the user actually sees. Inside a `.map()`, prefer the expression so every item
reports its own label.

Required event: `link_click`
Required parameters: `link_text`, `link_destination`

### BTN-001 — Every button emits `button_click` · **required**

Every `<button>` in scope must be a `<TrackedButton>`. A button is a user
action, and a user action is an event.

A button is **not required** to be tagged when it is decorative or purely
presentational, which it declares explicitly:

| Escape hatch | Use for |
| --- | --- |
| `aria-hidden="true"` | decoration that is not exposed to users at all |
| `data-analytics="ignore"` | a real control whose clicks are deliberately not measured |

Buttons rendered inside the tracking components in `src/app/_components/` are
also **not required** — that is where the tagging itself is implemented.

> **Why an explicit escape hatch:** the previous heuristic ("a button counts
> only if it has an `onClick`") silently ignored every button whose behaviour
> lives elsewhere — a form submit, a server action, an icon button wired up by a
> parent. Opting out on purpose is safer than being skipped by accident.

### BTN-002 — Button events carry an action and a label · **required**

Every `<TrackedButton>` must set `trackingAction` (stable `snake_case` id) and
`trackingLabel` (visible text).

Required event: `button_click`
Required parameters: `button_action`, `button_label`

### ABS-001 — No direct GA coupling · **required**

Application code must not reference `window.gtag` or `window.dataLayer`. Only
`src/lib/analytics.ts` and `src/app/_components/google-analytics.tsx` may.

### Interactive components — how to classify a new element

| The element… | Tagging |
| --- | --- |
| navigates the user somewhere | **required** (`link_click`) |
| triggers an action: submit, export, purchase, open a modal, run a query | **required** (`button_click`) |
| introduces a new route | **required** (`page_view`) |
| changes a filter, tab, sort, or step in a flow | **optional** — a `trackEvent` call with a custom name is encouraged |
| is purely presentational: layout, icon, static text, decoration | **not required** |
| is part of the tagging plumbing itself (`src/app/_components/`) | **not required** |

---

## 4. Minimum tagging coverage

A pull request is `COMPLIANT` only when **all** thresholds are met for the files
it touches.

| Category | Minimum coverage |
| --- | --- |
| New pages | **100%** |
| New navigation links | **100%** |
| New buttons | **100%** |
| Meaningful interactive elements | must have an associated analytics event |

Any `required` rule violation makes the result `NON_COMPLIANT`. `optional`
findings are reported as warnings and do not fail the build.

---

## 5. Machine-readable policy

Everything below is parsed by `tools/tagging/rules.mjs`. Keep it in sync with
the prose above — the prose is for humans, this block is what the pipeline runs.

```json tagging-policy
{
  "version": 1,
  "scope": {
    "include": ["src/app/**/*.tsx"],
    "exclude": ["src/app/_components/**", "src/app/layout.tsx"]
  },
  "conventions": {
    "analyticsModule": "~/lib/analytics",
    "componentsDir": "src/app/_components",
    "pageAnalytics": {
      "component": "PageAnalytics",
      "importFrom": "~/app/_components/page-analytics",
      "requiredProps": ["pageName"]
    },
    "trackedLink": {
      "component": "TrackedLink",
      "importFrom": "~/app/_components/tracked-link",
      "requiredProps": ["trackingLabel", "href"],
      "recommendedProps": ["trackingSource", "trackingPosition"]
    },
    "trackedButton": {
      "component": "TrackedButton",
      "importFrom": "~/app/_components/tracked-button",
      "requiredProps": ["trackingAction", "trackingLabel"],
      "recommendedProps": ["trackingSource"],
      "exemptWhenAttribute": ["aria-hidden", "data-analytics"]
    }
  },
  "events": {
    "page_view": { "requiredParams": ["page_name", "page_path"] },
    "link_click": { "requiredParams": ["link_text", "link_destination"] },
    "button_click": { "requiredParams": ["button_action", "button_label"] }
  },
  "rules": [
    {
      "id": "PAGE-001",
      "level": "required",
      "category": "page",
      "title": "Every page reports a page view",
      "detects": "pageWithoutPageAnalytics",
      "event": "page_view",
      "message": "The page does not report a page view.",
      "remedy": "Render <PageAnalytics pageName=\"{pageName}\" /> as the first child of the page."
    },
    {
      "id": "LINK-001",
      "level": "required",
      "category": "link",
      "title": "Every navigation link emits link_click",
      "detects": "untrackedLink",
      "event": "link_click",
      "message": "The link \"{label}\" is not tracked.",
      "remedy": "Replace <Link> with <TrackedLink trackingLabel=\"{label}\" trackingSource=\"{pageName}\" />."
    },
    {
      "id": "LINK-002",
      "level": "required",
      "category": "link",
      "title": "Link events carry text and destination",
      "detects": "trackedLinkMissingProps",
      "event": "link_click",
      "message": "The tracked link \"{label}\" is missing {missingProps}.",
      "remedy": "Add the missing props to <TrackedLink>."
    },
    {
      "id": "BTN-001",
      "level": "required",
      "category": "button",
      "title": "Every button emits button_click",
      "detects": "untrackedButton",
      "event": "button_click",
      "message": "The button \"{label}\" is not tracked.",
      "remedy": "Replace <button> with <TrackedButton trackingAction=\"{action}\" trackingLabel=\"{label}\" trackingSource=\"{pageName}\" />."
    },
    {
      "id": "BTN-002",
      "level": "required",
      "category": "button",
      "title": "Button events carry an action and a label",
      "detects": "trackedButtonMissingProps",
      "event": "button_click",
      "message": "The tracked button \"{label}\" is missing {missingProps}.",
      "remedy": "Add the missing props to <TrackedButton>."
    },
    {
      "id": "ABS-001",
      "level": "required",
      "category": "abstraction",
      "title": "No direct GA coupling",
      "detects": "directGtagUsage",
      "message": "This file talks to gtag/dataLayer directly.",
      "remedy": "Use trackEvent() from ~/lib/analytics instead."
    }
  ],
  "coverage": {
    "page": 100,
    "link": 100,
    "button": 100
  },
  "exempt": {
    "paths": [],
    "labels": []
  }
}
```
