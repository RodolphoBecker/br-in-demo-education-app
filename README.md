# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.

## Google Analytics

This POC sends GA4 events for page views, link clicks and button clicks.
See [`TAGGING_RULES.md`](./TAGGING_RULES.md) for the tagging rules the CI/CD
pipeline enforces.

### Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No | GA4 measurement ID, e.g. `G-XXXXXXXXXX`. |

Copy the value into your local `.env`:

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

Find it in GA4 → **Admin** → **Data streams** → your web stream. When the variable is
empty or absent, `gtag.js` is never loaded and every tracking call becomes a no-op —
the app keeps working normally.

### What was implemented

| File | Purpose |
| --- | --- |
| `src/env.js` | Validates `NEXT_PUBLIC_GA_MEASUREMENT_ID` (optional, must start with `G-`). |
| `src/lib/analytics.ts` | `trackEvent` / `trackLinkClick` / `trackButtonClick` / `trackPageView`; the only place that knows about `gtag`. |
| `src/app/_components/google-analytics.tsx` | Loads `gtag.js` via `next/script` (`afterInteractive`); renders `null` when unconfigured. |
| `src/app/_components/page-analytics.tsx` | `PageAnalytics`, emits `page_view` per route (including client-side navigation). |
| `src/app/_components/tracked-link.tsx` | `TrackedLink`, a `next/link` wrapper that emits the event on click. |
| `src/app/_components/tracked-button.tsx` | `TrackedButton`, a `<button>` wrapper that emits the event on click. |
| `src/app/layout.tsx` | Mounts `<GoogleAnalytics />` in the root layout. |
| `src/app/page.tsx` | Home page links replaced with `TrackedLink`. |

### Events

| Event | Emitted by | Parameters |
| --- | --- | --- |
| `page_view` | `<PageAnalytics>` | `page_name`, `page_path`, `page_location`, `page_title` |
| `link_click` | `<TrackedLink>` | `link_text`, `link_destination`, `link_source`, `link_position`, `page_location` |
| `button_click` | `<TrackedButton>` | `button_action`, `button_label`, `button_source`, `page_location` |

`gtag('config')` runs with `send_page_view: false`, so `<PageAnalytics>` owns
every page view. Without it the App Router would report no page view at all on
client-side navigation.

### Verifying events

1. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in `.env` and run `bun dev`.
2. **Network tab** — filter by `google-analytics.com/g/collect` and click a link; the
   request query string contains `en=link_click` plus the `ep.link_*` parameters.
3. **Console** — `window.dataLayer` lists every pushed event.
4. **GA4 DebugView** — Admin → DebugView, with the
   [GA Debugger extension](https://chromewebstore.google.com/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)
   enabled, or **Reports → Realtime**.

### Adding tracking elsewhere

```ts
import { trackEvent } from "~/lib/analytics";

trackEvent("cta_click", { cta_id: "signup" });
```

## Analytics Tagging Compliance (CI/CD demo)

A pull request that touches a page, link or button is checked against
[`TAGGING_RULES.md`](./TAGGING_RULES.md) by GitHub Actions. When tagging is
missing, the check fails with a report and a **"Fix it for me"** button that
runs a remediation agent, applies the tagging and pushes a commit.

The demo target is the **FTD Educação home page** (`src/app/page.tsx`).

```bash
bun run tagging:check   # analyze (exit 1 when NON_COMPLIANT)
bun run demo:reset      # stage the "before" state: the home page loses its tagging
bun run tagging:fix     # "Fix it for me" — put the tagging back
bun run demo:strip      # regenerate the fixture from the current page
```

The committed repository is compliant, so `bun run tagging:check` passes out of
the box. `demo:reset` stages the untagged home page — 22 violations across ten
sections — and `tagging:fix` resolves them; `git checkout src/app/page.tsx`
restores it. `bun run demo:reset reports` is a shorter, 4-violation scenario.

Full architecture, demo script and limitations:
[`docs/tagging-compliance.md`](./docs/tagging-compliance.md).

> The default remediation agent is a **simulation** (a deterministic codemod
> runner labelled "Claude Code (simulated)"), not a live AI integration.
> `tools/tagging/agent/claude-code.mjs` is the seam where a real Claude Code CLI
> run plugs in.
