/**
 * Minimal Google Analytics 4 helper.
 *
 * Keeps every `gtag` detail isolated in this module so components only deal
 * with plain, typed event payloads. Every function is a no-op when GA is not
 * configured or when running outside the browser (SSR / build).
 */

import { env } from "~/env";

type GtagParams = Record<string, string | number | boolean | undefined>;

declare global {
	interface Window {
		dataLayer?: unknown[];
		gtag?: (
			command: "config" | "event" | "js" | "set",
			targetOrEventName: string | Date,
			params?: GtagParams,
		) => void;
	}
}

/** GA4 measurement ID, or `undefined` when analytics is disabled. */
export const GA_MEASUREMENT_ID = env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/** True only when GA is configured *and* we are running in the browser. */
export const isAnalyticsEnabled = (): boolean =>
	typeof window !== "undefined" &&
	typeof window.gtag === "function" &&
	!!GA_MEASUREMENT_ID;

/**
 * Sends a GA4 event. Safe to call anywhere: it silently does nothing when GA
 * is not initialized, and never throws.
 */
export function trackEvent(name: string, params: GtagParams = {}): void {
	if (!isAnalyticsEnabled()) return;

	try {
		window.gtag?.("event", name, params);
	} catch {
		// Analytics must never break the application.
	}
}

export type LinkClickEvent = {
	/** Visible text of the link that was clicked. */
	linkText: string;
	/** `href` the link points to. */
	linkDestination: string;
	/** Component the link was rendered from, e.g. "home_page". */
	source?: string;
	/** 0-based position of the link inside its group. */
	position?: number;
};

/** Sends the POC's `link_click` event. */
export function trackLinkClick({
	linkText,
	linkDestination,
	source,
	position,
}: LinkClickEvent): void {
	trackEvent("link_click", {
		link_text: linkText,
		link_destination: linkDestination,
		link_source: source,
		link_position: position,
		page_location:
			typeof window === "undefined" ? undefined : window.location.href,
	});
}

export type ButtonClickEvent = {
	/** Stable identifier of the action, e.g. "export_csv". */
	action: string;
	/** Visible label of the button. */
	label: string;
	/** Component the button lives in, e.g. "reports_page". */
	source?: string;
};

/** Sends a `button_click` event. */
export function trackButtonClick({
	action,
	label,
	source,
}: ButtonClickEvent): void {
	trackEvent("button_click", {
		button_action: action,
		button_label: label,
		button_source: source,
		page_location:
			typeof window === "undefined" ? undefined : window.location.href,
	});
}

export type PageViewEvent = {
	/** Stable name of the page, e.g. "reports". */
	pageName: string;
	/** Route the user is on, e.g. "/reports". */
	pagePath: string;
};

/**
 * Sends a GA4 `page_view`.
 *
 * The App Router does a full document load only once, so `gtag('config')` runs
 * with `send_page_view: false` and every page view — including client-side
 * navigations — is reported from here instead.
 */
export function trackPageView({ pageName, pagePath }: PageViewEvent): void {
	trackEvent("page_view", {
		page_name: pageName,
		page_path: pagePath,
		page_location:
			typeof window === "undefined" ? undefined : window.location.href,
		page_title: typeof document === "undefined" ? undefined : document.title,
	});
}
