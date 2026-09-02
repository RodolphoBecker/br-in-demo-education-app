"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackLinkClick } from "~/lib/analytics";

type TrackedLinkProps = ComponentProps<typeof Link> & {
	/** Text reported as `link_text`. */
	trackingLabel: string;
	/** Component the link lives in, reported as `link_source`. */
	trackingSource: string;
	/** Position within its group, reported as `link_position`. */
	trackingPosition?: number;
};

/**
 * Drop-in replacement for `next/link` that emits a `link_click` GA4 event.
 *
 * Tracking runs synchronously in the click handler and never calls
 * `preventDefault`, so navigation behaves exactly like a plain `<Link>`.
 */
export function TrackedLink({
	trackingLabel,
	trackingPosition,
	trackingSource,
	onClick,
	...linkProps
}: TrackedLinkProps) {
	return (
		<Link
			{...linkProps}
			onClick={(event) => {
				trackLinkClick({
					linkText: trackingLabel,
					linkDestination: String(linkProps.href),
					source: trackingSource,
					position: trackingPosition,
				});
				onClick?.(event);
			}}
		/>
	);
}
