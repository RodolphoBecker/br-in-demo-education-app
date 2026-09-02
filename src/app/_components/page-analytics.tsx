"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackPageView } from "~/lib/analytics";

/**
 * Page-level analytics marker required by TAGGING_RULES.md (rule PAGE-001).
 *
 * Renders nothing and emits one `page_view` per route, including client-side
 * navigations. The `sentFor` ref keeps React Strict Mode's double-invoked
 * effect from producing duplicate events.
 */
export function PageAnalytics({ pageName }: { pageName: string }) {
	const pathname = usePathname();
	const sentFor = useRef<string | null>(null);

	useEffect(() => {
		if (sentFor.current === pathname) return;
		sentFor.current = pathname;
		trackPageView({ pageName, pagePath: pathname });
	}, [pageName, pathname]);

	return null;
}
