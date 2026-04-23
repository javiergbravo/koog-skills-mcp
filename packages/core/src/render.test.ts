import { describe, expect, it } from "vitest";
import { frontmatter, yamlScalar } from "./render.js";

describe("yamlScalar", () => {
	it("returns plain string unchanged", () => {
		expect(yamlScalar("hello")).toBe("hello");
	});

	it("quotes empty string", () => {
		expect(yamlScalar('""')).toBe('""');
	});

	it("quotes strings starting with special chars", () => {
		expect(yamlScalar("*ref")).toBe('"*ref"');
		expect(yamlScalar("&anchor")).toBe('"&anchor"');
		expect(yamlScalar("!tag")).toBe('"!tag"');
		expect(yamlScalar("#comment")).toBe('"#comment"');
		expect(yamlScalar("?conditional")).toBe('"?conditional"');
	});

	it("quotes strings with colons", () => {
		expect(yamlScalar("key: value")).toBe('"key: value"');
		expect(yamlScalar("trailing:")).toBe('"trailing:"');
	});

	it("quotes boolean-like strings", () => {
		expect(yamlScalar("true")).toBe('"true"');
		expect(yamlScalar("false")).toBe('"false"');
		expect(yamlScalar("null")).toBe('"null"');
		expect(yamlScalar("yes")).toBe('"yes"');
		expect(yamlScalar("no")).toBe('"no"');
	});

	it("quotes numeric strings", () => {
		expect(yamlScalar("42")).toBe('"42"');
		expect(yamlScalar("-3.14")).toBe('"-3.14"');
	});

	it("escapes backslashes and quotes when quoting is triggered", () => {
		// Quotes are triggered by colons, so backslashes inside get escaped
		expect(yamlScalar("path: C:\\Users")).toBe('"path: C:\\\\Users"');
		expect(yamlScalar('say: "hi"')).toBe('"say: \\"hi\\""');
	});
});

describe("frontmatter", () => {
	it("generates basic frontmatter block", () => {
		const result = frontmatter({ name: "test", description: "A test" });
		expect(result).toBe("---\nname: test\ndescription: A test\n---");
	});

	it("handles arrays", () => {
		const result = frontmatter({ keywords: ["a", "b", "c"] });
		expect(result).toBe("---\nkeywords:\n  - a\n  - b\n  - c\n---");
	});

	it("skips empty arrays", () => {
		const result = frontmatter({ name: "test", keywords: [] });
		expect(result).toBe("---\nname: test\n---");
	});

	it("handles boolean and number values", () => {
		const result = frontmatter({ active: true, count: 5 });
		expect(result).toBe("---\nactive: true\ncount: 5\n---");
	});

	it("skips null and undefined", () => {
		const result = frontmatter({
			name: "test",
			skip: null,
			also: undefined,
		});
		expect(result).toBe("---\nname: test\n---");
	});

	it("handles multiline strings", () => {
		const result = frontmatter({ desc: "line1\nline2\nline3" });
		expect(result).toBe("---\ndesc: |-\n  line1\n  line2\n  line3\n---");
	});

	it("handles nested objects", () => {
		const result = frontmatter({ metadata: { author: "test" } });
		expect(result).toContain("metadata:");
		expect(result).toContain("author: test");
	});

	it("supports indentation", () => {
		const result = frontmatter({ key: "value" }, 2);
		expect(result).toBe("  key: value");
	});
});
