import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseSkillFile } from "./parse.js";
import type { Skill, SkillReferenceContent } from "./types.js";

const IGNORED_DIRS = new Set([".git", "node_modules", ".github", "dist"]);

/** Maximum size (bytes) for a reference file read at runtime. */
const MAX_REF_FILE_SIZE = 1024 * 1024; // 1 MiB

function* walkSkillFiles(root: string): Generator<string> {
	const stack: string[] = [root];
	while (stack.length) {
		const dir = stack.pop();
		if (!dir) continue;
		let entries: string[];
		try {
			entries = readdirSync(dir);
		} catch {
			continue;
		}
		for (const name of entries) {
			if (IGNORED_DIRS.has(name)) continue;
			const full = join(dir, name);
			let st: ReturnType<typeof statSync>;
			try {
				st = statSync(full);
			} catch {
				continue;
			}
			if (st.isDirectory()) {
				stack.push(full);
			} else if (name === "SKILL.md") {
				yield full;
			}
		}
	}
}

export async function loadSkills(skillsRoot: string): Promise<Skill[]> {
	const root = resolve(skillsRoot);
	if (!existsSync(root)) {
		throw new Error(`Skills root does not exist: ${root}`);
	}
	const skills: Skill[] = [];
	for (const path of walkSkillFiles(root)) {
		skills.push(parseSkillFile(path, { skillsRoot: root }));
	}
	skills.sort((a, b) => a.name.localeCompare(b.name));
	return skills;
}

export function loadSkillReferences(skill: Skill): SkillReferenceContent[] {
	return skill.references.map((ref) => {
		if (ref.content !== undefined) {
			return {
				relPath: ref.relPath,
				absPath: ref.absPath,
				content: ref.content,
			};
		}
		if (!existsSync(ref.absPath)) {
			return { relPath: ref.relPath, absPath: ref.absPath, content: "" };
		}
		const st = statSync(ref.absPath);
		if (st.size > MAX_REF_FILE_SIZE) {
			throw new Error(
				`Reference file exceeds size limit (${MAX_REF_FILE_SIZE} bytes): ${ref.absPath} (${st.size} bytes)`,
			);
		}
		return {
			relPath: ref.relPath,
			absPath: ref.absPath,
			content: readFileSync(ref.absPath, "utf8"),
		};
	});
}
