import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSkillReferences, loadSkills } from "./load.js";

const SKILLS_ROOT = resolve(import.meta.dirname, "../../../skills");

describe("loadSkills", () => {
	it("loads all 38 skills from disk", async () => {
		const skills = await loadSkills(SKILLS_ROOT);
		expect(skills.length).toBe(38);
	});

	it("returns sorted skills by name", async () => {
		const skills = await loadSkills(SKILLS_ROOT);
		const names = skills.map((s) => s.name);
		const sorted = [...names].sort();
		expect(names).toEqual(sorted);
	});

	it("each skill has required fields", async () => {
		const skills = await loadSkills(SKILLS_ROOT);
		for (const skill of skills) {
			expect(skill.name).toBeTruthy();
			expect(skill.description).toBeTruthy();
			expect(skill.category).toBeTruthy();
			expect(skill.path).toBeTruthy();
			expect(skill.dir).toBeTruthy();
			expect(skill.body).toBeTruthy();
			expect(Array.isArray(skill.headings)).toBe(true);
			expect(Array.isArray(skill.keywords)).toBe(true);
			expect(skill.frontmatter).toBeDefined();
			expect(Array.isArray(skill.references)).toBe(true);
		}
	});

	it("covers all 9 categories", async () => {
		const skills = await loadSkills(SKILLS_ROOT);
		const categories = [...new Set(skills.map((s) => s.category))].sort();
		expect(categories).toEqual([
			"advanced",
			"agents",
			"features",
			"getting-started",
			"integrations",
			"memory-and-rag",
			"prompts",
			"strategies",
			"tools",
		]);
	});

	it("throws on non-existent directory", async () => {
		await expect(loadSkills("/non/existent/path")).rejects.toThrow();
	});
});

describe("loadSkillReferences", () => {
	it("loads references for a skill with refs", async () => {
		const skills = await loadSkills(SKILLS_ROOT);
		const skillWithRefs = skills.find((s) => s.references.length > 0);
		if (!skillWithRefs) return; // skip if no skills have refs

		const refs = loadSkillReferences(skillWithRefs);
		expect(refs.length).toBe(skillWithRefs.references.length);
		for (const ref of refs) {
			expect(ref.relPath).toBeTruthy();
			expect(ref.absPath).toBeTruthy();
			expect(typeof ref.content).toBe("string");
		}
	});

	it("returns empty array for skill without refs", async () => {
		const skills = await loadSkills(SKILLS_ROOT);
		const skillNoRefs = skills.find((s) => s.references.length === 0);
		if (!skillNoRefs) return;

		const refs = loadSkillReferences(skillNoRefs);
		expect(refs).toEqual([]);
	});
});
