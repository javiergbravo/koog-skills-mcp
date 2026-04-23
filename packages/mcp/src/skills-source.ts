import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkills, type Skill } from "@koog-skills/core";
import { z } from "zod";

export interface LoadOpts {
	/** Override: parse fresh from a directory containing SKILL.md files. */
	skillsDir?: string;
	/** Override: read from a pre-built JSON snapshot. */
	bundlePath?: string;
}

/** Relative-path regex — must not start with / and must not contain .. segments */
const REL_PATH_RE = /^(?!\/)(?!.*\.\.[/\\]|.*\.\.$)/;

const SkillReferenceSchema = z.object({
	relPath: z.string(),
	absPath: z
		.string()
		.regex(
			REL_PATH_RE,
			"absPath in bundle must be a relative path without traversal",
		),
	content: z.string().optional(),
});

const SkillFrontmatterBundleSchema = z
	.object({
		name: z.string(),
		description: z.string(),
		license: z.string().optional(),
		compatibility: z.string().optional(),
		allowedTools: z.string().optional(),
		metadata: z
			.object({
				author: z.string().optional(),
				version: z.string().optional(),
				keywords: z.array(z.string()),
			})
			.passthrough()
			.default({ keywords: [] }),
	})
	.passthrough();

const SkillBundleSchema = z.array(
	z
		.object({
			name: z.string(),
			description: z.string(),
			category: z.string(),
			path: z
				.string()
				.regex(
					REL_PATH_RE,
					"path in bundle must be a relative path without traversal",
				),
			dir: z
				.string()
				.regex(
					REL_PATH_RE,
					"dir in bundle must be a relative path without traversal",
				),
			body: z.string(),
			headings: z.array(z.string()),
			keywords: z.array(z.string()),
			frontmatter: SkillFrontmatterBundleSchema,
			references: z.array(SkillReferenceSchema),
		})
		.passthrough(),
);

export async function loadSkillsForServer(
	opts: LoadOpts = {},
): Promise<Skill[]> {
	if (opts.skillsDir) {
		return loadSkills(opts.skillsDir);
	}
	const bundlePath =
		opts.bundlePath ?? fileURLToPath(new URL("./skills.json", import.meta.url));
	if (!existsSync(bundlePath)) {
		throw new Error(
			`No skills bundle found at ${bundlePath}. Pass --skills-dir <path> or rebuild the package.`,
		);
	}
	const raw = readFileSync(bundlePath, "utf8");

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(
			`Failed to parse skills bundle at ${bundlePath}: invalid JSON`,
		);
	}

	const result = SkillBundleSchema.safeParse(parsed);
	if (!result.success) {
		throw new Error(
			`Invalid skills bundle at ${bundlePath}: ${result.error.issues
				.map((i) => `[${i.path.join(".")}] ${i.message}`)
				.join("; ")}`,
		);
	}

	const skills = result.data as Skill[];
	// Bundle stores paths relative to the original skills root; rebase to bundle dir
	// so absolute paths in error messages remain meaningful.
	const bundleDir = resolve(bundlePath, "..");
	return skills.map((s) => ({
		...s,
		path: resolve(bundleDir, s.path),
		dir: resolve(bundleDir, s.dir),
		references: s.references.map((r) => ({
			...r,
			absPath: resolve(bundleDir, r.absPath),
		})),
	}));
}
