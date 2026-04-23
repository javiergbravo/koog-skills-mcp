#!/usr/bin/env node

/**
 * CI release script — runs after changesets/action merges the "Version Packages" PR.
 *
 * At this point versions are already bumped and CHANGELOGs are up to date.
 * This script only needs to:
 *   1. Build all packages
 *   2. Tag the current commit
 *   3. Create a GitHub Release
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function run(cmd) {
	console.log(`\x1b[36m▸ ${cmd}\x1b[0m`);
	return execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

function capture(cmd) {
	return execSync(cmd, { cwd: ROOT, encoding: "utf-8" }).trim();
}

// 1. Read current version (already bumped by changesets)
const pkg = JSON.parse(
	readFileSync(resolve(ROOT, "packages/mcp/package.json"), "utf-8"),
);
const version = pkg.version;
const tag = `v${version}`;
console.log(`\n\x1b[1mRelease ${tag}\x1b[0m\n`);

// 2. Build
console.log("\x1b[1mStep 1/3: Building packages...\x1b[0m");
run("pnpm build");

// 3. Tag (skip if already exists)
console.log("\n\x1b[1mStep 2/3: Creating git tag...\x1b[0m");
const existingTags = capture("git tag -l").split("\n");
if (existingTags.includes(tag)) {
	console.log(`\x1b[33m⚠ Tag ${tag} already exists, skipping.\x1b[0m`);
} else {
	run(`git tag ${tag}`);
	run(`git push origin ${tag}`);
	console.log(`\x1b[32m✔ Tag ${tag} created and pushed.\x1b[0m`);
}

// 4. Create GitHub Release
console.log("\n\x1b[1mStep 3/3: Creating GitHub Release...\x1b[0m");
try {
	run(`gh release create ${tag} --title ${tag} --generate-notes`);
	console.log(`\x1b[32m✔ GitHub Release ${tag} created.\x1b[0m`);
} catch {
	console.log(
		"\x1b[33m⚠ Could not create GitHub Release (is `gh` installed and authenticated?).\x1b[0m",
	);
	console.log("  You can create it manually at:");
	console.log(
		`  https://github.com/javiergbravo/koog-skills-mcp/releases/new?tag=${tag}`,
	);
}

console.log(`\n\x1b[32m✔ Release ${tag} complete!\x1b[0m`);
