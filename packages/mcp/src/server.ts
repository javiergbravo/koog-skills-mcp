import { type Skill, type SkillIndex, buildIndex } from '@koog-skills/core';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { rebuildSkillMarkdown } from './render.js';
import { type LoadOpts, loadSkillsForServer } from './skills-source.js';

export interface CreateServerOptions extends LoadOpts {
  name?: string;
  version?: string;
}

export async function createServer(opts: CreateServerOptions = {}): Promise<McpServer> {
  const skills = await loadSkillsForServer(opts);
  const byName = new Map(skills.map((s) => [s.name, s]));
  const index: SkillIndex = buildIndex(skills);

  const server = new McpServer({
    name: opts.name ?? 'koog-skills',
    version: opts.version ?? '0.1.0',
  });

  registerListSkills(server, skills);
  registerSearchSkills(server, index);
  registerGetSkill(server, byName);
  registerSkillResource(server, byName, skills);

  return server;
}

function asJsonContent(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

function registerListSkills(server: McpServer, skills: Skill[]): void {
  server.registerTool(
    'list_skills',
    {
      title: 'List Koog skills',
      description:
        'List all available Koog framework skills. Each skill is a self-contained guide for a specific Koog feature (e.g. agents, tools, memory, RAG, streaming, MCP integration). Use this when the user asks an open-ended Koog question and you want to discover what curated guidance exists. Prefer search_skills when you have a specific query.',
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe(
            'Filter by category folder (e.g. "agents", "tools", "memory-and-rag", "strategies", "prompts", "integrations", "features", "advanced", "getting-started").',
          ),
        limit: z
          .number()
          .int()
          .positive()
          .max(200)
          .optional()
          .describe('Max results (default 50).'),
      },
    },
    async ({ category, limit }) => {
      const filtered = category ? skills.filter((s) => s.category === category) : skills;
      const sliced = filtered.slice(0, limit ?? 50);
      return asJsonContent(
        sliced.map((s) => ({
          name: s.name,
          category: s.category,
          description: s.description,
          keywords: s.keywords,
        })),
      );
    },
  );
}

function registerSearchSkills(server: McpServer, index: SkillIndex): void {
  server.registerTool(
    'search_skills',
    {
      title: 'Search Koog skills',
      description:
        'Full-text search the Koog framework skills library by keyword or natural-language query. Returns ranked matches with a short snippet. Call this BEFORE answering any non-trivial Koog question — the curated skills carry the canonical JetBrains guidance. Then call get_skill with the top result to read its full content.',
      inputSchema: {
        query: z.string().min(1).describe('Search query (keywords or natural language).'),
        k: z
          .number()
          .int()
          .positive()
          .max(20)
          .optional()
          .describe('Number of results (default 5).'),
      },
    },
    async ({ query, k }) => {
      const hits = index.search(query, k ?? 5);
      return asJsonContent(hits);
    },
  );
}

function registerGetSkill(server: McpServer, byName: Map<string, Skill>): void {
  server.registerTool(
    'get_skill',
    {
      title: 'Get full Koog skill',
      description:
        'Fetch the full SKILL.md content for a named skill. Set include_references=true to inline every linked reference file. Always read the returned skill in full before acting on it — it contains step-by-step procedures, code examples, and API references you must follow.',
      inputSchema: {
        name: z.string().min(1).describe('Skill name (kebab-case, e.g. "graph-based-agents").'),
        include_references: z
          .boolean()
          .optional()
          .describe('If true, inline all referenced files at the end. Default false.'),
      },
    },
    async ({ name, include_references }) => {
      const skill = byName.get(name);
      if (!skill) {
        const available = Array.from(byName.keys()).join(', ');
        return {
          isError: true,
          content: [
            { type: 'text' as const, text: `Unknown skill "${name}". Available: ${available}` },
          ],
        };
      }
      const text = rebuildSkillMarkdown(skill, { includeReferences: include_references ?? false });
      return { content: [{ type: 'text' as const, text }] };
    },
  );
}

function registerSkillResource(
  server: McpServer,
  byName: Map<string, Skill>,
  skills: Skill[],
): void {
  server.registerResource(
    'skill',
    new ResourceTemplate('skill://{name}', {
      list: async () => ({
        resources: skills.map((s) => ({
          uri: `skill://${s.name}`,
          name: s.name,
          title: s.name,
          description: s.description,
          mimeType: 'text/markdown',
        })),
      }),
    }),
    {
      title: 'Koog skill',
      description: 'A single SKILL.md from Koog skills, addressed by name.',
      mimeType: 'text/markdown',
    },
    async (uri, { name }) => {
      const skillName = Array.isArray(name) ? name[0] : name;
      if (!skillName) throw new Error(`Missing skill name in URI: ${uri.href}`);
      const skill = byName.get(skillName);
      if (!skill) throw new Error(`Unknown skill: ${skillName}`);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: rebuildSkillMarkdown(skill),
          },
        ],
      };
    },
  );
}
