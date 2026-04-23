import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSkills } from "./load.js";
import { buildIndex } from "./search.js";

const SKILLS_ROOT = resolve(import.meta.dirname, "../../../skills");

describe("buildIndex", () => {
	it("builds index with correct size", async () => {
		const skills = await loadSkills(SKILLS_ROOT);
		const index = buildIndex(skills);
		expect(index.size).toBe(38);
	});

	it("search returns results for known skill", async () => {
		const skills = await loadSkills(SKILLS_ROOT);
		const index = buildIndex(skills);
		const results = index.search("memory");
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].name).toBeTruthy();
		expect(results[0].score).toBeGreaterThan(0);
		expect(results[0].description).toBeTruthy();
		expect(results[0].category).toBeTruthy();
	});

	it("search respects k parameter", async () => {
		const skills = await loadSkills(SKILLS_ROOT);
		const index = buildIndex(skills);
		const results = index.search("agent", 3);
		expect(results.length).toBeLessThanOrEqual(3);
	});

	it("search returns empty for nonsense query", async () => {
		const skills = await loadSkills(SKILLS_ROOT);
		const index = buildIndex(skills);
		const results = index.search("xyzzyplughnonexistent");
		expect(results.length).toBe(0);
	});

	it("search results have snippet", async () => {
		const skills = await loadSkills(SKILLS_ROOT);
		const index = buildIndex(skills);
		const results = index.search("tool");
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].snippet).toBeTruthy();
	});

	it("search finds skills by keyword", async () => {
		const skills = await loadSkills(SKILLS_ROOT);
		const index = buildIndex(skills);
		const results = index.search("RAG");
		expect(results.length).toBeGreaterThan(0);
		const names = results.map((r) => r.name);
		expect(names.some((n) => n.includes("rag") || n.includes("memory"))).toBe(
			true,
		);
	});

	it("search finds skills by category term", async () => {
		const skills = await loadSkills(SKILLS_ROOT);
		const index = buildIndex(skills);
		const results = index.search("prompts");
		expect(results.length).toBeGreaterThan(0);
	});
});
