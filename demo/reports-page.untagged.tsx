// DEMO FIXTURE — a smaller "before" state for the tagging compliance demo.
//
// The /reports page with its analytics tagging removed: no <PageAnalytics>, a
// plain <Link> and a plain <button>. Four violations instead of the home page's
// twenty-two, for a shorter walkthrough.
//
// Regenerate with `bun run demo:strip reports`; stage with
// `bun run demo:reset reports`.
// --- fixture content below ---

"use client";

import Link from "next/link";

export default function ReportsPage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
			<div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
				<h1 className="font-extrabold text-5xl text-white tracking-tight sm:text-[5rem]">
					Reports
				</h1>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
					<Link
						className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20"
						href="/reports/monthly"
					>
						<h3 className="font-bold text-2xl">View Report →</h3>
						<div className="text-lg">
							Monthly engagement summary across every acquisition channel.
						</div>
					</Link>
					<div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white">
						<h3 className="font-bold text-2xl">Export</h3>
						<div className="text-lg">
							Download the current report as a spreadsheet.
						</div>
						<button
							className="rounded-full bg-white/10 px-6 py-2 font-semibold transition hover:bg-white/20"
							onClick={() => {
								/* demo only: no real export */
							}}
							type="button"
						>
							Export CSV
						</button>
					</div>
				</div>
				<Link className="text-lg text-white/70 hover:text-white" href="/">
					← Back to home
				</Link>
			</div>
		</main>
	);
}
