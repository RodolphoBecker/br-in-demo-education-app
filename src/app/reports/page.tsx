"use client";

import { PageAnalytics } from "~/app/_components/page-analytics";
import { TrackedButton } from "~/app/_components/tracked-button";
import { TrackedLink } from "~/app/_components/tracked-link";

export default function ReportsPage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
			<PageAnalytics pageName="reports" />
			<div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
				<h1 className="font-extrabold text-5xl text-white tracking-tight sm:text-[5rem]">
					Reports
				</h1>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
					<TrackedLink
						className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20"
						href="/reports/monthly"
						trackingLabel="View Report"
						trackingPosition={0}
						trackingSource="reports"
					>
						<h3 className="font-bold text-2xl">View Report →</h3>
						<div className="text-lg">
							Monthly engagement summary across every acquisition channel.
						</div>
					</TrackedLink>
					<div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white">
						<h3 className="font-bold text-2xl">Export</h3>
						<div className="text-lg">
							Download the current report as a spreadsheet.
						</div>
						<TrackedButton
							className="rounded-full bg-white/10 px-6 py-2 font-semibold transition hover:bg-white/20"
							onClick={() => {
								/* demo only: no real export */
							}}
							trackingAction="export_csv"
							trackingLabel="Export CSV"
							trackingSource="reports"
							type="button"
						>
							Export CSV
						</TrackedButton>
					</div>
				</div>
				<TrackedLink
					className="text-lg text-white/70 hover:text-white"
					href="/"
					trackingLabel="Back to home"
					trackingPosition={1}
					trackingSource="reports"
				>
					← Back to home
				</TrackedLink>
			</div>
		</main>
	);
}
