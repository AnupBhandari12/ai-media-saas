import { describe, expect, test } from "bun:test";

import {
  TOOL_STATUS,
  getToolById,
  getToolBySlug,
  getToolsByCategory,
  tools,
} from "../../lib/tools/registry.js";

describe("tool registry", () => {
  test("contains the first 10 tools", () => {
    expect(tools).toHaveLength(10);
  });

  test("every tool has required fields", () => {
    for (const tool of tools) {
      expect(tool.id).toBeTruthy();
      expect(tool.slug).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(tool.category).toBeTruthy();
      expect(tool.route).toBeTruthy();
      expect(tool.engine).toBeTruthy();
      expect(tool.inputTypes.length).toBeGreaterThan(0);
      expect(tool.outputTypes.length).toBeGreaterThan(0);
      expect(tool.quotaKey).toBeTruthy();
      expect(tool.status).toBeTruthy();
      expect(tool.priority).toBeTruthy();
    }
  });

  test("tool IDs are unique", () => {
    const ids = tools.map((tool) => tool.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  test("tool slugs are unique", () => {
    const slugs = tools.map((tool) => tool.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("tool routes are unique", () => {
    const routes = tools.map((tool) => tool.route);

    expect(new Set(routes).size).toBe(routes.length);
  });

  test("can find a tool by ID", () => {
    const tool = getToolById("IMG-01");

    expect(tool?.name).toBe("Compress Image");
  });

  test("can find a tool by slug", () => {
    const tool = getToolBySlug("passport-id-photo");

    expect(tool?.id).toBe("IMG-10");
  });

  test("can filter tools by category", () => {
    const imageTools = getToolsByCategory("IMAGE");

    expect(imageTools).toHaveLength(10);
  });

  test("unfinished tools are marked coming soon", () => {
    for (const tool of tools) {
      expect(tool.status).toBe(
        TOOL_STATUS.COMING_SOON
      );
    }
  });
});