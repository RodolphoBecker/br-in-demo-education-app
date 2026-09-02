/**
 * Layer 5a — Code transformations.
 *
 * The actual edits that make a file compliant. Kept separate from the agent so
 * that the mock agent and a real Claude Code run can be compared against the
 * same definition of "correct output".
 *
 * Every transform is driven by the conventions declared in TAGGING_RULES.md —
 * component names and prop names are never hardcoded here.
 */

import { defaultExportBody, readAttr, toSnakeCase } from "./scanner.mjs";

/** Adds `import { X } from "…"` if it is not already there. */
function ensureImport(source, componentName, importFrom) {
	if (new RegExp(`\\b${componentName}\\b`).test(source.split("\n")[0] ?? "")) {
		return source;
	}
	const alreadyImported = new RegExp(
		`import\\s*\\{[^}]*\\b${componentName}\\b[^}]*\\}\\s*from`,
	).test(source);
	if (alreadyImported) return source;

	const statement = `import { ${componentName} } from "${importFrom}";`;
	const lastImport = [...source.matchAll(/^import .*;$/gm)].pop();
	if (!lastImport) return `${statement}\n\n${source}`;

	const end = lastImport.index + lastImport[0].length;
	return `${source.slice(0, end)}\n${statement}${source.slice(end)}`;
}

/** Removes an import that is no longer used anywhere in the file. */
function dropUnusedImport(source, componentName) {
	const pattern = new RegExp(
		`^import ${componentName} from ["'][^"']+["'];\\n`,
		"m",
	);
	if (!pattern.test(source)) return source;
	const withoutImport = source.replace(pattern, "");
	const stillUsed = new RegExp(`<${componentName}(?=[\\s/>])`).test(
		withoutImport,
	);
	return stillUsed ? source : withoutImport;
}

/** Indentation of the line containing `index`. */
function indentAt(source, index) {
	const lineStart = source.lastIndexOf("\n", index) + 1;
	return /^[\t ]*/.exec(source.slice(lineStart, index))?.[0] ?? "";
}

/**
 * PAGE-001 — render `<PageAnalytics pageName="…" />` as the first child of the
 * page's root element.
 */
export function addPageAnalytics(source, { policy, pageName }) {
	const { component, importFrom } = policy.conventions.pageAnalytics;

	// Everything here is scoped to the exported page component. A route file
	// often declares small helper components above it, so the first `return (`
	// in the file usually belongs to one of those — putting the marker there
	// would fire a page view once per helper render.
	const body = defaultExportBody(source);
	if (!body) return source;
	if (new RegExp(`<${component}(?=[\\s/>])`).test(body.text)) return source;

	// First child position = end of the root element's opening tag.
	const rootOpen = /return\s*\(\s*\n(\s*)<(\w+)([^>]*)>/.exec(body.text);
	if (!rootOpen) return source;

	const insertAt = body.start + rootOpen.index + rootOpen[0].length;
	const indent = `${rootOpen[1]}\t`;
	const withComponent = `${source.slice(0, insertAt)}\n${indent}<${component} pageName="${pageName}" />${source.slice(insertAt)}`;

	return ensureImport(withComponent, component, importFrom);
}

/**
 * Renders one JSX prop.
 *
 * A prop is `[name, value]` for a string literal, or `[name, value, "expr"]`
 * when the value is JavaScript that must stay unquoted, as in
 * `trackingLabel={item.label}`.
 */
function renderProp([name, value, kind]) {
	if (kind === "expr" || typeof value === "number") {
		return `${name}={${value}}`;
	}
	return `${name}="${escapeAttr(String(value))}"`;
}

/** Rewrites one element's opening tag: new name + added props. */
function retagElement(source, element, newTagName, props) {
	const attrs = element.attrs.trimEnd();
	const indent = `${indentAt(source, element.start)}\t`;

	const rendered = props
		.filter(([, value]) => value !== undefined && value !== null)
		.map(renderProp);

	const attrLines = attrs
		? `${attrs}\n${rendered.map((p) => `${indent}${p}`).join("\n")}`
		: `\n${rendered.map((p) => `${indent}${p}`).join("\n")}\n${indentAt(source, element.start)}`;

	const openTag = `<${newTagName}${attrLines}${element.selfClosing ? " />" : "\n" + indentAt(source, element.start) + ">"}`;

	const head = source.slice(0, element.start);
	const tail = source.slice(element.openTagEnd + 1);
	const retagged = `${head}${openTag}${tail}`;

	return element.selfClosing
		? retagged
		: retagged.replace(new RegExp(`</${element.tagName}>`), `</${newTagName}>`);
}

function escapeAttr(value) {
	return value.replace(/"/g, "&quot;");
}

/**
 * LINK-001 — turn a `<Link>` / `<a href>` into a `<TrackedLink>` carrying the
 * link text and destination.
 */
export function trackLink(source, { policy, element, pageName, position }) {
	const { component, importFrom } = policy.conventions.trackedLink;
	const props = [
		labelProp("trackingLabel", element, readAttr(element.attrs, "href")),
		["trackingSource", element.source || pageName],
	];

	// Inside a `.map()` the loop index is the position. Without an index
	// binding there is no per-item value, and a constant would claim every item
	// sits in the same place — so the (recommended, not required) prop is left
	// off for a human to fill in.
	if (element.mapIndex) {
		props.push(["trackingPosition", element.mapIndex, "expr"]);
	} else if (!element.inMap && typeof position === "number") {
		props.push(["trackingPosition", position]);
	}

	const retagged = retagElement(source, element, component, props);
	const withImport = ensureImport(retagged, component, importFrom);
	return dropUnusedImport(withImport, "Link");
}

/**
 * The `trackingLabel` prop: an expression when the visible text comes from a
 * variable, a literal when it is static.
 */
function labelProp(name, element, fallback) {
	if (element.labelExpr) return [name, element.labelExpr, "expr"];
	return [name, element.label || fallback || "link"];
}

/** BTN-001 — turn a `<button>` into a `<TrackedButton>`. */
export function trackButton(source, { policy, element, pageName }) {
	const { component, importFrom } = policy.conventions.trackedButton;
	const sectionName = element.source || pageName;

	const props = [
		["trackingAction", buttonAction(element, sectionName)],
		labelProp("trackingLabel", element, "button"),
		["trackingSource", sectionName],
	];

	const retagged = retagElement(source, element, component, props);
	return ensureImport(retagged, component, importFrom);
}

/**
 * A stable `snake_case` action id. Derived from the visible label when it is
 * static; a dynamic label cannot name a fixed action, so the section does.
 */
function buttonAction(element, sectionName) {
	if (element.labelExpr || !element.label) return `${sectionName}_click`;
	return toSnakeCase(element.label);
}

/** LINK-002 / BTN-002 — add the props a tracked element is missing. */
export function addMissingProps(source, { element, values }) {
	const props = element.missing.map((name) => [name, values[name]]);
	return retagElement(source, element, element.tagName, props);
}
