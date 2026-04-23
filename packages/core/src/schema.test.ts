import { describe, expect, it } from "vitest";
import { SkillFrontmatterSchema } from "./schema.js";

describe("SkillFrontmatterSchema", () => {
	const validInput = {
		name: "my-skill",
		description: "A test skill",
		metadata: {
			author: "test",
			version: "1.0.0",
			keywords: ["test", "example"],
		},
	};

	it("accepts valid frontmatter", () => {
		const result = SkillFrontmatterSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	it("transforms allowed-tools to allowedTools", () => {
		const input = { ...validInput, "allowed-tools": "tool1, tool2" };
		const result = SkillFrontmatterSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.allowedTools).toBe("tool1, tool2");
		}
	});

	it("defaults metadata.keywords to empty array", () => {
		const input = {
			name: "my-skill",
			description: "A test skill",
			metadata: {},
		};
		const result = SkillFrontmatterSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.metadata.keywords).toEqual([]);
		}
	});

	it("defaults metadata when missing", () => {
		const input = { name: "my-skill", description: "A test skill" };
		const result = SkillFrontmatterSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.metadata.keywords).toEqual([]);
		}
	});

	it("passes through extra YAML fields", () => {
		const input = { ...validInput, custom_field: "value", extra: 42 };
		const result = SkillFrontmatterSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect((result.data as Record<string, unknown>).custom_field).toBe(
				"value",
			);
		}
	});

	it("rejects missing name", () => {
		const input = { description: "no name" };
		const result = SkillFrontmatterSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it("rejects missing description", () => {
		const input = { name: "my-skill" };
		const result = SkillFrontmatterSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it("rejects non-kebab-case name", () => {
		const input = { ...validInput, name: "My_Skill" };
		const result = SkillFrontmatterSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it("rejects name longer than 64 chars", () => {
		const input = { ...validInput, name: "a".repeat(65) };
		const result = SkillFrontmatterSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it("rejects empty description", () => {
		const input = { ...validInput, description: "" };
		const result = SkillFrontmatterSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it("accepts optional fields", () => {
		const input = {
			...validInput,
			license: "Apache-2.0",
			compatibility: "Koog 0.8.0",
		};
		const result = SkillFrontmatterSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.license).toBe("Apache-2.0");
			expect(result.data.compatibility).toBe("Koog 0.8.0");
		}
	});
});
