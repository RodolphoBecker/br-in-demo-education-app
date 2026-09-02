import Script from "next/script";
import { GA_MEASUREMENT_ID } from "~/lib/analytics";

/**
 * Loads the GA4 gtag.js snippet.
 *
 * Renders nothing when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is not set, so the app
 * runs normally without analytics configured. `next/script` handles injection
 * after hydration, which keeps SSR output identical either way.
 */
export function GoogleAnalytics() {
	if (!GA_MEASUREMENT_ID) return null;

	return (
		<>
			<Script
				src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
				strategy="afterInteractive"
			/>
			<Script id="ga-init" strategy="afterInteractive">
				{`
					window.dataLayer = window.dataLayer || [];
					function gtag(){dataLayer.push(arguments);}
					gtag('js', new Date());
					// Page views are sent by <PageAnalytics />, which also covers
					// client-side navigations. See TAGGING_RULES.md (PAGE-001).
					gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
				`}
			</Script>
		</>
	);
}
