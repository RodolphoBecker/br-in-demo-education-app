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
		// `page.tsx` at the root has no leading slash to strip.
		.replace(/(?:^|\/)page\.tsx$/, "")
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

const truncate = (text) =>
	text.length > 60 ? `${text.slice(0, 57).trimEnd()}…` : text;

/** A label expression has to be a plain value: `item.label`, not a ternary. */
const SIMPLE_PATH = /^[A-Za-z_$][\w$]*(?:\.[\w$]+)*$/;

/** Splits JSX children into static text and top-level `{expression}` chunks. */
function splitChunks(inner) {
	const chunks = [];
	let text = "";
	let depth = 0;
	let exprStart = 0;

	const flushText = () => {
		const cleaned = cleanLabel(text);
		if (cleaned) chunks.push({ text: cleaned });
		text = "";
	};

	for (let i = 0; i < inner.length; i++) {
		const char = inner[i];
		if (char === "{") {
			// Emit the text that came before this expression first, so the
			// chunks stay in reading order.
			if (depth === 0) {
				flushText();
				exprStart = i + 1;
			}
			depth++;
		} else if (char === "}") {
			depth--;
			if (depth === 0) {
				const expr = inner.slice(exprStart, i).trim();
				// `{" "}` and friends are JSX whitespace, not content.
				if (/^["'`]\s*["'`]$/.test(expr)) text += " ";
				// Only a plain value reads as a label. Conditionals, calls and
				// nested JSX render something else and are not text.
				else if (SIMPLE_PATH.test(expr)) chunks.push({ expr });
			}
		} else if (depth === 0) {
			text += char;
		}

		if (depth === 0 && i === inner.length - 1) flushText();
	}

	return chunks;
}

/**
 * The label a human would give the element, and how to write it in JSX.
 *
 * Returns `{ text, expr }`. `text` is always a readable string for reports.
 * `expr` is set when the label cannot be a plain literal — because the visible
 * text comes from a variable — and holds the JSX expression to emit, e.g.
 * `item.label` or a template literal for mixed content.
 *
 * Resolution order: heading text, then children, then `aria-label`, then the
 * single child component's name, then the href.
 */
export function deriveLabel(inner, attrs = "") {
	const heading = HEADING.exec(inner);
	const scope = heading ? heading[1] : inner;
	// Drop the tags first: their attributes hold braces of their own
	// (`className={...}`) which are markup, not visible text.
	const chunks = splitChunks(scope.replace(/<[^>]*>/g, " "));

	const texts = chunks.filter((c) => c.text !== undefined);
	const exprs = chunks.filter((c) => c.expr !== undefined);

	if (exprs.length === 0 && texts.length > 0) {
		return { expr: null, text: truncate(texts.map((c) => c.text).join(" ")) };
	}

	if (exprs.length === 1 && texts.length === 0) {
		return { expr: exprs[0].expr, text: exprs[0].expr };
	}

	if (exprs.length > 0) {
		// Mixed content: a template literal keeps the static and dynamic parts.
		const template = chunks
			.map((c) => (c.expr !== undefined ? `\${${c.expr}}` : c.text))
			.join(" ");
		return { expr: `\`${template}\``, text: truncate(template) };
	}

	const aria = readAttrRaw(attrs, "aria-label");
	if (aria?.value) {
		return aria.expression && SIMPLE_PATH.test(aria.value)
			? { expr: aria.value, text: aria.value }
			: { expr: null, text: aria.value };
	}

	// Icon- or logo-only elements: name them after their single child component.
	const childComponent = /<([A-Z]\w+)(?=[\s/>])/.exec(inner);
	if (childComponent) return { expr: null, text: childComponent[1] };

	return { expr: null, text: "" };
}

/** `function SiteHeader()` -> `site_header`, `HeroSection` -> `hero`. */
export function sourceFromComponent(name) {
	return toSnakeCase(name.replace(/Section$/, "")) || "page";
}

/**
 * Name of the component function that renders the element at `index`.
 *
 * The default export counts too: an element rendered directly by the page
 * would otherwise inherit the name of the last helper declared above it.
 */
export function enclosingComponent(source, index) {
	const declarations = [
		...source
			.slice(0, index)
			.matchAll(/^(?:export\s+default\s+)?function (\w+)/gm),
	];
	return declarations.length ? declarations[declarations.length - 1][1] : null;
}

/**
 * Whether the element sits inside a `.map()` callback, and the name of that
 * callback's index parameter when it has one.
 *
 * Both halves matter: inside a loop, a *constant* position would label every
 * item identically, so a position is only ever emitted when there is an index
 * binding to emit.
 */
export function enclosingMap(source, index) {
	const callbacks = [
		...source
			.slice(0, index)
			.matchAll(/\.map\(\(\s*(\w+)\s*(?:,\s*(\w+)\s*)?\)\s*=>/g),
	];

	for (let i = callbacks.length - 1; i >= 0; i--) {
		const callback = callbacks[i];
		const bodyEnd = matchingBracket(
			source,
			callback.index + callback[0].length,
		);
		if (bodyEnd !== null && index > bodyEnd) continue; // already closed
		return { inMap: true, mapIndex: callback[2] ?? null };
	}

	return { inMap: false, mapIndex: null };
}

const DEFAULT_EXPORT = "export default function";

/**
 * The body of the page's default-exported component.
 *
 * A route file usually also declares helper components above the page itself.
 * Page-level tagging belongs to the exported page and nowhere else, so both the
 * check and the codemod work inside this range rather than the whole file —
 * otherwise `<PageAnalytics />` could land in a tiny helper that renders dozens
 * of times, and the file-wide check would happily call that compliant.
 *
 * @returns {{start: number, end: number, text: string} | null}
 */
export function defaultExportBody(source) {
	const at = source.indexOf(DEFAULT_EXPORT);
	if (at === -1) return null;

	const paramsEnd = matchingBracket(source, at + DEFAULT_EXPORT.length);
	if (paramsEnd === null) return null;

	const bodyStart = source.indexOf("{", paramsEnd + 1);
	if (bodyStart === -1) return null;

	const bodyEnd = matchingBracket(source, bodyStart);
	if (bodyEnd === null) return null;

	return {
		start: bodyStart,
		end: bodyEnd,
		text: source.slice(bodyStart, bodyEnd + 1),
	};
}

/** End offset of the bracketed expression that starts at or after `from`. */
function matchingBracket(source, from) {
	const start = source.slice(from).search(/[({]/);
	if (start === -1) return null;

	const openAt = from + start;
	const open = source[openAt];
	const close = open === "(" ? ")" : "}";
	let depth = 0;

	for (let i = openAt; i < source.length; i++) {
		if (source[i] === open) depth++;
		else if (source[i] === close) {
			depth--;
			if (depth === 0) return i;
		}
	}
	return null;
}

/** "View Report" -> "view_report", "SiteHeader" -> "site_header" */
export function toSnakeCase(label) {
	return (
		label
			.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
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
export function findOpenTagEnd(source, start) {
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

/**
 * Reads an attribute and reports how it was written: `foo="bar"` is a literal,
 * `foo={bar}` is an expression. The distinction matters when the value is
 * copied into generated code.
 */
export function readAttrRaw(attrs, name) {
	const literal = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(attrs);
	if (literal) return { value: literal[1], expression: false };

	const expression = new RegExp(`\\b${name}\\s*=\\s*\\{([^}]*)\\}`).exec(attrs);
	if (expression) return { value: expression[1].trim(), expression: true };

	return new RegExp(`\\b${name}\\b`).test(attrs)
		? { value: "", expression: false }
		: null;
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

	/** Where the element sits in the file: which component, which loop. */
	const context = (el) => {
		const component = enclosingComponent(source, el.start);
		return {
			component,
			// `trackingSource` reads better as the section that renders the
			// element than as the page as a whole.
			source: component ? sourceFromComponent(component) : pageName,
			...enclosingMap(source, el.start),
		};
	};

	const describe = (el) => {
		const { text, expr } = deriveLabel(el.inner, el.attrs);
		return { label: text, labelExpr: expr, ...context(el) };
	};

	const collectLinks = (tagName, tracked) => {
		for (const el of findElements(source, tagName)) {
			links.push({
				...el,
				...describe(el),
				tracked,
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
			...describe(el),
			tracked: false,
			href: readAttr(el.attrs, "href") ?? "",
			missing: [],
		});
	}

	for (const el of findElements(source, trackedButton.component)) {
		const described = describe(el);
		buttons.push({
			...el,
			...described,
			label: described.label || readAttr(el.attrs, "trackingLabel") || "",
			tracked: true,
			required: true,
			missing: missingProps(el.attrs, trackedButton.requiredProps),
		});
	}
	for (const el of findElements(source, "button")) {
		// BTN-001: every button needs tracking unless it opts out explicitly.
		const exempt = (trackedButton.exemptWhenAttribute ?? []).some(
			(attr) => readAttr(el.attrs, attr) !== undefined,
		);
		buttons.push({
			...el,
			...describe(el),
			tracked: false,
			required: !exempt,
			missing: [],
		});
	}

	return {
		filePath,
		source,
		isPage,
		route,
		pageName,
		// Must be rendered by the exported page, not merely present in the file.
		hasPageAnalytics: new RegExp(`<${pageAnalytics.component}(?=[\\s/>])`).test(
			defaultExportBody(source)?.text ?? source,
		),
		links,
		buttons,
		usesGtagDirectly: /\bwindow\s*\.\s*(gtag|dataLayer)\b/.test(source),
	};
}
