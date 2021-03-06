import path, {ParsedPath} from "path";
import {platform} from "os";
import {
	BABEL_RUNTIME_PREFIX_1,
	BABEL_RUNTIME_PREFIX_2,
	D_TS_EXTENSION,
	D_TS_MAP_EXTENSION,
	KNOWN_EXTENSIONS,
	NODE_MODULES,
	NODE_MODULES_MATCH_PATH,
	ROLLUP_PLUGIN_MULTI_ENTRY_LEGACY,
	ROLLUP_PLUGIN_VIRTUAL_PREFIX,
	TSLIB_NAME
} from "../../constant/constant";
import slash from "slash";
import {ExternalOption} from "rollup";
import {ensureArray} from "../ensure-array/ensure-array";

export const ROOT_DIRECTORY = path.parse(process.cwd()).root;
export const PLATFORM = platform();
export const DRIVE_LETTER_REGEXP = /^\w:/;

export function relative(from: string, to: string): string {
	return ensurePosix(path.relative(from, to));
}

export function join(...paths: string[]): string {
	return ensurePosix(path.join(...paths));
}

export function normalize(p: string): string {
	return ensurePosix(p);
}

export function resolve(p: string): string {
	return ensurePosix(path.resolve(p));
}

export function dirname(p: string): string {
	return ensurePosix(path.dirname(p));
}

export function basename(p: string): string {
	return ensurePosix(path.basename(p));
}

export function extname(p: string): string {
	return path.extname(p);
}

export function parse(p: string): ParsedPath {
	const parsedPath = path.parse(p);
	return {
		ext: parsedPath.ext,
		name: normalize(parsedPath.name),
		base: normalize(parsedPath.base),
		dir: normalize(parsedPath.dir),
		root: normalize(parsedPath.root)
	};
}

export function isTypeScriptLib(p: string): boolean {
	return p.startsWith(`lib.`) && p.endsWith(D_TS_EXTENSION);
}

/**
 * On Windows, it is important that all absolute paths are absolute, including the drive letter, because TypeScript assumes this
 */
export function ensureHasDriveLetter(p: string): string {
	if (PLATFORM !== "win32") return p;
	if (DRIVE_LETTER_REGEXP.test(p)) return p;
	if (p.startsWith(ROOT_DIRECTORY)) return p;
	if (!isAbsolute(p)) return p;
	return nativeJoin(ROOT_DIRECTORY, p);
}

/**
 * Ensures that the given path follows posix file names
 */
export function ensurePosix(p: string): string {
	return slash(p);
}

export function nativeNormalize(p: string): string {
	// Converts to either POSIX or native Windows file paths
	return path.normalize(p);
}

export function nativeDirname(p: string): string {
	return path.dirname(p);
}

export function nativeJoin(...paths: string[]): string {
	return path.join(...paths);
}

export function isAbsolute(p: string): boolean {
	return path.isAbsolute(p);
}

/**
 * Gets the extension of the given file
 */
export function getExtension(file: string): string {
	if (file.endsWith(D_TS_EXTENSION)) return D_TS_EXTENSION;
	else if (file.endsWith(D_TS_MAP_EXTENSION)) return D_TS_MAP_EXTENSION;
	return extname(file);
}

/**
 * Returns true if the given path represents an external library
 */
export function isExternalLibrary(p: string): boolean {
	return (!p.startsWith(".") && !p.startsWith("/")) || p.includes(NODE_MODULES_MATCH_PATH);
}

/**
 * Returns true if the given id represents tslib
 */
export function isTslib(p: string): boolean {
	return p === "tslib" || normalize(p).endsWith(`/tslib/${TSLIB_NAME}`) || normalize(p).endsWith("/tslib/tslib.es6.js") || normalize(p).endsWith("/tslib/tslib.js");
}

/**
 * Returns true if the given path represents a Babel helper
 */
export function isBabelHelper(p: string): boolean {
	return includesBabelEsmHelper(p) || isBabelCjsHelper(p);
}

/**
 * Returns true if the given path represents an internal core-js file.
 * This is relevant when combining Babel's preset-env with 'useBuiltIns' with values other than false.
 */
export function isCoreJsInternals(p: string): boolean {
	const normalizedPath = normalize(p);
	return normalizedPath.includes(NODE_MODULES) && normalizedPath.includes("core-js/");
}

/**
 * Returns true if the given path represents a Babel ESM helper
 */
export function includesBabelEsmHelper(p: string): boolean {
	return normalize(p).includes(`${BABEL_RUNTIME_PREFIX_1}helpers/esm`) || normalize(p).includes(`${BABEL_RUNTIME_PREFIX_2}helpers/esm`);
}

/**
 * Returns true if the given path represents a Babel CJS helper
 */
export function isBabelCjsHelper(p: string): boolean {
	return !includesBabelEsmHelper(p) && (normalize(p).includes(`${BABEL_RUNTIME_PREFIX_1}helpers`) || normalize(p).includes(`${BABEL_RUNTIME_PREFIX_2}helpers`));
}

/**
 * Returns true if the given path represents @babel/preset-env
 */
export function isBabelPresetEnv(p: string): boolean {
	return normalize(p).includes("@babel/preset-env") || normalize(p).includes("babel-preset-env");
}

/**
 * Returns true if the given path is related to @rollup/plugin-virtual or the old version of @rollup/plugin-multi-entry
 */
export function isVirtualFile(p: string): boolean {
	const normalized = normalize(p);
	return normalized === ROLLUP_PLUGIN_MULTI_ENTRY_LEGACY || normalized.startsWith(ROLLUP_PLUGIN_VIRTUAL_PREFIX);
}

/**
 * Returns true if the given path is the name of the entry module or @rollup/plugin-multi-entry
 */
export function isMultiEntryModule(p: string, multiEntryModuleName: string | undefined): boolean {
	const normalized = normalize(p);
	return normalized === ROLLUP_PLUGIN_MULTI_ENTRY_LEGACY || (multiEntryModuleName != null && normalized === multiEntryModuleName);
}

/**
 * Returns true if the given path represents @babel/preset-es[2015|2016|2017]
 */
export function isYearlyBabelPreset(p: string): boolean {
	return normalize(p).includes("@babel/preset-es") || normalize(p).includes("babel-preset-es");
}

/**
 * Returns true if the given path represents @babel/plugin-transform-runtime
 */
export function isBabelPluginTransformRuntime(p: string): boolean {
	return normalize(p).includes("@babel/plugin-transform-runtime") || normalize(p).includes("babel-plugin-transform-runtime");
}

export function somePathsAreRelated(paths: Iterable<string>, matchPath: string): boolean {
	for (const p of paths) {
		if (pathsAreRelated(p, matchPath)) return true;
	}
	return false;
}

export function pathsAreRelated(a: string, b: string): boolean {
	if (a === b) return true;

	// A node_modules folder may contain one or more nested node_modules
	if (a.includes(NODE_MODULES) || b.includes(NODE_MODULES)) {
		const firstPathFromNodeModules = a.includes(NODE_MODULES) ? a.slice(a.indexOf(NODE_MODULES)) : a;
		const secondPathFromNodeModules = b.includes(NODE_MODULES) ? b.slice(b.indexOf(NODE_MODULES)) : b;

		if (firstPathFromNodeModules.includes(secondPathFromNodeModules)) return true;
		if (secondPathFromNodeModules.includes(firstPathFromNodeModules)) return true;
	}

	return false;
}

/**
 * Strips the extension from a file
 */
export function stripKnownExtension(file: string): string {
	let currentExtname: string | undefined;

	for (const extName of KNOWN_EXTENSIONS) {
		if (file.endsWith(extName)) {
			currentExtname = extName;
			break;
		}
	}

	if (currentExtname == null) return file;

	return file.slice(0, file.lastIndexOf(currentExtname));
}

/**
 * Sets the given extension for the given file
 */
export function setExtension(file: string, extension: string): string {
	return normalize(`${stripKnownExtension(file)}${extension}`);
}

/**
 * Ensure that the given path has a leading "."
 */
export function ensureHasLeadingDotAndPosix(p: string, externalGuard = true): string {
	if (externalGuard && isExternalLibrary(p)) return p;

	const posixPath = ensurePosix(p);
	if (posixPath.startsWith(".")) return posixPath;
	if (posixPath.startsWith("/")) return `.${posixPath}`;
	return `./${posixPath}`;
}

/**
 * Ensures that the given path is relative
 */
export function ensureRelative(root: string, p: string): string {
	// If the path is already relative, simply return it
	if (!isAbsolute(p)) {
		return normalize(p);
	}

	// Otherwise, construct a relative path from the root
	return relative(root, p);
}

/**
 * Ensures that the given path is absolute
 */
export function ensureAbsolute(root: string, p: string): string {
	// If the path is already absolute, simply return it
	if (isAbsolute(p)) {
		return normalize(p);
	}

	// Otherwise, construct an absolute path from the root
	return join(root, p);
}

/**
 * Checks the id from the given importer with respect to the given externalOption provided to Rollup
 */
export function isExternal(id: string, importer: string, externalOption: ExternalOption | undefined | boolean): boolean {
	if (externalOption == null) return false;
	if (externalOption === true) return true;
	if (externalOption === false) return false;
	if (typeof externalOption === "function") return externalOption(id, importer, true) ?? false;

	const ids = new Set<string>();
	const matchers: RegExp[] = [];
	for (const value of ensureArray(externalOption)) {
		if (value instanceof RegExp) {
			matchers.push(value);
		} else {
			ids.add(value);
		}
	}

	return ids.has(id) || matchers.some(matcher => matcher.test(id));
}
