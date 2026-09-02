"use client";

import type { ComponentProps } from "react";
import { trackButtonClick } from "~/lib/analytics";

type TrackedButtonProps = ComponentProps<"button"> & {
	/** Stable action id reported as `button_action`, e.g. "export_csv". */
	trackingAction: string;
	/** Visible label reported as `button_label`. */
	trackingLabel: string;
	/** Component the button lives in, reported as `button_source`. */
	trackingSource: string;
};

/**
 * Drop-in replacement for `<button>` that emits a `button_click` GA4 event.
 *
 * Tracking runs synchronously before the original handler and never blocks it,
 * so the button behaves exactly like a plain `<button>`.
 */
export function TrackedButton({
	trackingAction,
	trackingLabel,
	trackingSource,
	onClick,
	...buttonProps
}: TrackedButtonProps) {
	return (
		<button
			{...buttonProps}
			onClick={(event) => {
				trackButtonClick({
					action: trackingAction,
					label: trackingLabel,
					source: trackingSource,
				});
				onClick?.(event);
			}}
			type={buttonProps.type ?? "button"}
		/>
	);
}
