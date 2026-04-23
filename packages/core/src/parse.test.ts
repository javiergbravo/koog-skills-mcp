import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSkillFile } from "./parse.js";

const SKILLS_ROOT = resolve(import.meta.dirname, "../../../skills");

describe("parseSkillFile", () => {
	it("parses a real SKILL.md file", () => {
		const skill = parseSkillFile(
			resolve(SKILLS_ROOT, "agents/basic-agents/SKILL.md"),
			{ skillsRoot: SKILLS_ROOT },
		);

		expect(skill.name).toBe("basic-agents");
		expect(skill.description).toBeTruthy();
		expect(skill.category).toBe("agents");
		expect(skill.body).toBeTruthy();
		expect(skill.headings.length).toBeGreaterThan(0);
		expect(skill.frontmatter).toBeDefined();
		expect(skill.frontmatter.name).toBe("basic-agents");
	});

	it("derives category from directory structure", () => {
		const skill = parseSkillFile(
			resolve(SKILLS_ROOT, "tools/class-based/SKILL.md"),
			{ skillsRoot: SKILLS_ROOT },
		);
		expect(skill.category).toBe("tools");
	});

	it("extracts headings from markdown", () => {
		const skill = parseSkillFile(
			resolve(SKILLS_ROOT, "agents/graph-based-agents/SKILL.md"),
			{ skillsRoot: SKILLS_ROOT },
		);
		expect(skill.headings.length).toBeGreaterThan(0);
		expect(skill.headings.every((h) => typeof h === "string")).toBe(true);
	});

	it("sets absolute path and dir", () => {
		const skill = parseSkillFile(
			resolve(SKILLS_ROOT, "memory-and-rag/agent-memory/SKILL.md"),
			{ skillsRoot: SKILLS_ROOT },
		);
		expect(skill.path).toContain("agent-memory");
		expect(skill.dir).toContain("agent-memory");
		expect(skill.path).toMatch(/SKILL\.md$/);
	});

	it("returns references array", () => {
		const skill = parseSkillFile(
			resolve(SKILLS_ROOT, "agents/basic-agents/SKILL.md"),
			{ skillsRoot: SKILLS_ROOT },
		);
		expect(Array.isArray(skill.references)).toBe(true);
	});

	it("throws on invalid frontmatter", () => {
		expect(() =>
			parseSkillFile(resolve(SKILLS_ROOT, "agents"), {
				skillsRoot: SKILLS_ROOT,
			}),
		).toThrow();
	});
});
