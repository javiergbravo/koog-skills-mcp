import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SKILLS_DIR = resolve(import.meta.dirname, "../../../skills");

let client: Client;

beforeAll(async () => {
	const transport = new StdioClientTransport({
		command: "node",
		args: [
			resolve(import.meta.dirname, "../dist/bin.js"),
			"--skills-dir",
			SKILLS_DIR,
		],
	});
	client = new Client({ name: "test-client", version: "1.0.0" });
	await client.connect(transport);
});

afterAll(async () => {
	await client?.close();
});

describe("MCP Server", () => {
	it("exposes 3 tools", async () => {
		const { tools } = await client.listTools();
		const names = tools.map((t) => t.name).sort();
		expect(names).toEqual(["get_skill", "list_skills", "search_skills"]);
	});

	it("exposes 38 resources", async () => {
		const { resources } = await client.listResources();
		expect(resources.length).toBe(38);
	});
});

describe("list_skills tool", () => {
	it("returns all 38 skills", async () => {
		const result = await client.callTool({
			name: "list_skills",
			arguments: {},
		});
		const skills = JSON.parse(result.content[0].text as string);
		expect(skills.length).toBe(38);
		expect(skills[0]).toHaveProperty("name");
		expect(skills[0]).toHaveProperty("category");
		expect(skills[0]).toHaveProperty("description");
	});

	it("filters by category", async () => {
		const result = await client.callTool({
			name: "list_skills",
			arguments: { category: "agents" },
		});
		const skills = JSON.parse(result.content[0].text as string);
		expect(skills.length).toBe(4);
		expect(skills.every((s) => s.category === "agents")).toBe(true);
	});

	it("respects limit parameter", async () => {
		const result = await client.callTool({
			name: "list_skills",
			arguments: { limit: 5 },
		});
		const skills = JSON.parse(result.content[0].text as string);
		expect(skills.length).toBeLessThanOrEqual(5);
	});

	it("returns empty for unknown category", async () => {
		const result = await client.callTool({
			name: "list_skills",
			arguments: { category: "nonexistent" },
		});
		const skills = JSON.parse(result.content[0].text as string);
		expect(skills.length).toBe(0);
	});
});

describe("search_skills tool", () => {
	it("returns results for a known query", async () => {
		const result = await client.callTool({
			name: "search_skills",
			arguments: { query: "memory" },
		});
		const hits = JSON.parse(result.content[0].text as string);
		expect(hits.length).toBeGreaterThan(0);
		expect(hits[0]).toHaveProperty("name");
		expect(hits[0]).toHaveProperty("score");
		expect(hits[0]).toHaveProperty("description");
		expect(hits[0]).toHaveProperty("snippet");
	});

	it("respects k parameter", async () => {
		const result = await client.callTool({
			name: "search_skills",
			arguments: { query: "agent", k: 2 },
		});
		const hits = JSON.parse(result.content[0].text as string);
		expect(hits.length).toBeLessThanOrEqual(2);
	});

	it("returns empty for nonsense query", async () => {
		const result = await client.callTool({
			name: "search_skills",
			arguments: { query: "xyzzyplughnonexistent" },
		});
		const hits = JSON.parse(result.content[0].text as string);
		expect(hits.length).toBe(0);
	});

	it("finds skills by Kotlin-related terms", async () => {
		const result = await client.callTool({
			name: "search_skills",
			arguments: { query: "Koog agent tool" },
		});
		const hits = JSON.parse(result.content[0].text as string);
		expect(hits.length).toBeGreaterThan(0);
	});
});

describe("get_skill tool", () => {
	it("returns full skill content", async () => {
		const result = await client.callTool({
			name: "get_skill",
			arguments: { name: "basic-agents" },
		});
		const text = result.content[0].text as string;
		expect(text).toContain("#");
		expect(text).toContain("```");
		expect(text.length).toBeGreaterThan(500);
		expect(text).toContain("basic-agents");
	});

	it("returns skill with references when requested", async () => {
		const withoutRefs = await client.callTool({
			name: "get_skill",
			arguments: { name: "graph-based-agents" },
		});
		const withRefs = await client.callTool({
			name: "get_skill",
			arguments: { name: "graph-based-agents", include_references: true },
		});
		// With refs should be at least as long as without
		expect((withRefs.content[0].text as string).length).toBeGreaterThanOrEqual(
			(withoutRefs.content[0].text as string).length,
		);
	});

	it("returns error for unknown skill", async () => {
		const result = await client.callTool({
			name: "get_skill",
			arguments: { name: "does-not-exist" },
		});
		expect(result.isError).toBe(true);
		expect(result.content[0].text as string).toContain("does-not-exist");
	});

	it("lists available skills in error message", async () => {
		const result = await client.callTool({
			name: "get_skill",
			arguments: { name: "nope" },
		});
		expect(result.isError).toBe(true);
		const text = result.content[0].text as string;
		expect(text).toContain("Available:");
		expect(text).toContain("basic-agents");
	});
});

describe("skill resources", () => {
	it("reads a skill resource by URI", async () => {
		const result = await client.readResource({
			uri: "skill://basic-agents",
		});
		expect(result.contents.length).toBe(1);
		expect(result.contents[0].mimeType).toBe("text/markdown");
		expect(result.contents[0].text).toContain("basic-agents");
	});

	it("lists all skills as resources", async () => {
		const { resources } = await client.listResources();
		const uris = resources.map((r) => r.uri);
		expect(uris).toContain("skill://basic-agents");
		expect(uris).toContain("skill://graph-based-agents");
		expect(uris).toContain("skill://agent-memory");
	});

	it("all resource URIs follow skill:// pattern", async () => {
		const { resources } = await client.listResources();
		for (const r of resources) {
			expect(r.uri).toMatch(/^skill:\/\/[a-z0-9-]+$/);
		}
	});
});
