import { PageAnalytics } from "~/app/_components/page-analytics";
import { TrackedLink } from "~/app/_components/tracked-link";

export default function MonthlyReportPage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
			<PageAnalytics pageName="reports_monthly" />
			<div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
				<h1 className="font-extrabold text-5xl text-white tracking-tight sm:text-[5rem]">
					Monthly
				</h1>
				<div className="max-w-xs rounded-xl bg-white/10 p-4 text-lg text-white">
					Engagement summary for the current month.
				</div>
				<TrackedLink
					className="text-lg text-white/70 hover:text-white"
					href="/reports"
					trackingLabel="Back to reports"
					trackingSource="reports_monthly"
				>
					← Back to reports
				</TrackedLink>
			</div>
		</main>
	);
}
