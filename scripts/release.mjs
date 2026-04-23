#!/usr/bin/env node

/**
 * Local release script for koog-skills-mcp.
 *
 * Usage: pnpm release:local
 *
 * This script:
 * 1. Checks for clean working tree
 * 2. Builds all packages
 * 3. Applies changesets (bumps versions + generates changelogs)
 * 4. Creates a release commit and tag
 * 5. Pushes to remote
 * 6. Creates a GitHub Release with the changelog
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

function getVersion() {
	const pkg = JSON.parse(
		readFileSync(resolve(ROOT, "packages/mcp/package.json"), "utf-8"),
	);
	return pkg.version;
}

// 1. Check clean working tree
const status = capture("git status --porcelain");
if (status) {
	console.error(
		"\x1b[31m✖ Working tree is not clean. Commit or stash changes first.\x1b[0m",
	);
	process.exit(1);
}

// 2. Build
console.log("\n\x1b[1mStep 1/5: Building packages...\x1b[0m");
run("pnpm build");

// 3. Apply changesets
console.log("\n\x1b[1mStep 2/5: Applying changesets...\x1b[0m");
const versionBefore = getVersion();
run("changeset version");
const versionAfter = getVersion();

if (versionBefore === versionAfter) {
	console.log("\x1b[33m⚠ No changesets to apply. Nothing to release.\x1b[0m");
	process.exit(0);
}

console.log(
	`\n\x1b[32m✔ Version bumped: ${versionBefore} → ${versionAfter}\x1b[0m`,
);

// 4. Commit and tag
console.log("\n\x1b[1mStep 3/5: Creating release commit and tag...\x1b[0m");
run("git add .");
run(`git commit -m "chore: release v${versionAfter}"`);
run(`git tag "v${versionAfter}"`);

// 5. Push
console.log("\n\x1b[1mStep 4/5: Pushing to remote...\x1b[0m");
run("git push");
run("git push --tags");

// 6. Create GitHub Release
console.log("\n\x1b[1mStep 5/5: Creating GitHub Release...\x1b[0m");

// Extract changelog for this version
const mcpChangelog = readFileSync(
	resolve(ROOT, "packages/mcp/CHANGELOG.md"),
	"utf-8",
);

// Parse the latest version section from the changelog
const versionRegex = /## (\d+\.\d+\.\d+)\n\n([\s\S]*?)(?=\n## \d+\.\d+\.\d+|$)/;
const match = mcpChangelog.match(versionRegex);
const releaseNotes = match ? match[2].trim() : `Release v${versionAfter}`;

// Write temp file for gh release body
const tmpFile = resolve(ROOT, ".release-notes.md");
const { writeFileSync } = await import("node:fs");
writeFileSync(tmpFile, releaseNotes);

try {
	run(
		`gh release create "v${versionAfter}" --title "v${versionAfter}" --notes-file "${tmpFile}"`,
	);
} catch {
	console.log(
		"\x1b[33m⚠ Could not create GitHub Release (is `gh` installed and authenticated?).\x1b[0m",
	);
	console.log("  You can create it manually at:");
	console.log(
		`  https://github.com/javiergbravo/koog-skills-mcp/releases/new?tag=v${versionAfter}`,
	);
} finally {
	// Clean up temp file
	execSync(`rm -f "${tmpFile}"`);
}

console.log(`\n\x1b[32m✔ Release v${versionAfter} complete!\x1b[0m`);
