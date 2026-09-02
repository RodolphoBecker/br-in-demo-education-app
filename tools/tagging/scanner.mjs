/**
 * Layer 2 — Source scanner.
 *
 * Turns a `.tsx` file into a small inventory of the things the tagging rules
 * care about: the page itself, its links and its buttons.
 *
 * This is a deliberately lightweight lexical scanner, not a type-aware AST
 * pass. It is accurate enough for the conventions this repository uses and
 * keeps the POC dependency-free; swapping it for a real AST visitor later would
 * not change any other layer.
 */

/** `src/app/reports/page.tsx` -> `/reports` */
export function routeFromPageFile(filePath) {
	const segments = filePath
		.replace(/^src\/app\//, "")
		.replace(/\/page\.tsx$/, "")
		.split("/")
		.filter((s) => s && !(s.startsWith("(") && s.endsWith(")")));
	return segments.length ? `/${segments.join("/")}` : "/";
}

/** `/reports/monthly` -> `reports_monthly`, `/` -> `home` */
export function pageNameFromRoute(route) {
	if (route === "/") return "home";
	return route
		.slice(1)
		.replace(/\[|\]|\./g, "")
		.replace(/[/-]/g, "_")
		.toLowerCase();
}

/** "View Report →" -> "View Report" */
export function cleanLabel(raw) {
	return raw
		.replace(/<[^>]*>/g, " ")
		.replace(/\{[^}]*\}/g, " ")
		.replace(/[→←↑↓»«]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

const HEADING = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/;

/**
 * The text a human would call the element.
 *
 * Card-style links wrap a heading plus a paragraph of copy; the heading is the
 * label, not the whole block. Falls back to the element's text, truncated so a
 * `trackingLabel` never turns into a sentence.
 */
export function deriveLabel(inner) {
	const heading = HEADING.exec(inner);
	const text = cleanLabel(heading ? heading[1] : inner);
	return text.length > 60 ? `${text.slice(0, 57).trimEnd()}…` : text;
}

/** "View Report" -> "view_report" */
export function toSnakeCase(label) {
	return (
		label
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "_")
			.replace(/^_+|_+$/g, "") || "action"
	);
}

export function isPageFile(filePath) {
	return /(^|\/)page\.tsx$/.test(filePath);
}

/** Line number (1-based) of a character offset. */
function lineAt(source, index) {
	return source.slice(0, index).split("\n").length;
}

/**
 * Finds every `<Tag …>…</Tag>` / `<Tag … />` element for a given tag name.
 * Returns the opening-tag attribute text, the inner text and offsets.
 */
function findElements(source, tagName) {
	const found = [];
	const opener = new RegExp(`<${tagName}(?=[\\s/>])`, "g");

	for (const match of source.matchAll(opener)) {
		const start = match.index;
		const attrsEnd = findOpenTagEnd(source, start);
		if (attrsEnd === -1) continue;

		const selfClosing = source[attrsEnd - 1] === "/";
		const attrs = source.slice(
			start + tagName.length + 1,
			selfClosing ? attrsEnd - 1 : attrsEnd,
		);

		let inner = "";
		let end = attrsEnd + 1;
		if (!selfClosing) {
			const close = source.indexOf(`</${tagName}>`, attrsEnd);
			if (close !== -1) {
				inner = source.slice(attrsEnd + 1, close);
				end = close + tagName.length + 3;
			}
		}

		found.push({
			tagName,
			attrs,
			inner,
			start,
			end,
			openTagEnd: attrsEnd,
			selfClosing,
			line: lineAt(source, start),
		});
	}

	return found;
}

/** Index of the `>` that closes the opening tag, respecting quotes and braces. */
function findOpenTagEnd(source, start) {
	let depth = 0;
	let quote = null;

	for (let i = start; i < source.length; i++) {
		const char = source[i];

		if (quote) {
			if (char === quote) quote = null;
			continue;
		}
		if (char === '"' || char === "'" || char === "`") {
			quote = char;
			continue;
		}
		if (char === "{") depth++;
		else if (char === "}") depth--;
		else if (char === ">" && depth === 0) return i;
	}

	return -1;
}

/** Reads a `name="value"` attribute out of an opening tag. */
export function readAttr(attrs, name) {
	const stringValue = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(attrs);
	if (stringValue) return stringValue[1];
	const exprValue = new RegExp(`\\b${name}\\s*=\\s*\\{([^}]*)\\}`).exec(attrs);
	if (exprValue) return exprValue[1].trim();
	return new RegExp(`\\b${name}\\b`).test(attrs) ? "" : undefined;
}

function missingProps(attrs, required) {
	return required.filter((prop) => readAttr(attrs, prop) === undefined);
}

/**
 * Scans one source file.
 *
 * @param {string} filePath repo-relative path
 * @param {string} source file contents
 * @param {object} policy parsed tagging policy
 */
export function scanFile(filePath, source, policy) {
	const { pageAnalytics, trackedLink, trackedButton } = policy.conventions;

	const isPage = isPageFile(filePath);
	const route = isPage ? routeFromPageFile(filePath) : null;
	const pageName = isPage ? pageNameFromRoute(route) : null;

	const links = [];
	const buttons = [];

	const collectLinks = (tagName, tracked) => {
		for (const el of findElements(source, tagName)) {
			const label =
				deriveLabel(el.inner) || readAttr(el.attrs, "aria-label") || "";
			links.push({
				...el,
				tracked,
				label,
				href: readAttr(el.attrs, "href") ?? "",
				missing: tracked
					? missingProps(el.attrs, trackedLink.requiredProps)
					: [],
			});
		}
	};

	collectLinks(trackedLink.component, true);
	collectLinks("Link", false);
	for (const el of findElements(source, "a")) {
		if (readAttr(el.attrs, "href") === undefined) continue;
		links.push({
			...el,
			tracked: false,
			label: deriveLabel(el.inner),
			href: readAttr(el.attrs, "href") ?? "",
			missing: [],
		});
	}

	for (const el of findElements(source, trackedButton.component)) {
		buttons.push({
			...el,
			tracked: true,
			label: deriveLabel(el.inner) || readAttr(el.attrs, "trackingLabel") || "",
			missing: missingProps(el.attrs, trackedButton.requiredProps),
		});
	}
	for (const el of findElements(source, "button")) {
		// Only "primary" buttons are required to be tagged (BTN-001).
		const isPrimary =
			readAttr(el.attrs, "onClick") !== undefined ||
			readAttr(el.attrs, "type") === "submit";
		buttons.push({
			...el,
			tracked: false,
			isPrimary,
			label: deriveLabel(el.inner),
			missing: [],
		});
	}

	return {
		filePath,
		source,
		isPage,
		route,
		pageName,
		hasPageAnalytics: new RegExp(`<${pageAnalytics.component}(?=[\\s/>])`).test(
			source,
		),
		links,
		buttons,
		usesGtagDirectly: /\bwindow\s*\.\s*(gtag|dataLayer)\b/.test(source),
	};
}
