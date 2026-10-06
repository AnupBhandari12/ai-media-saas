import {
  describe,
  expect,
  test,
} from "bun:test";

import {
  TOOL_STATUS,
  getToolById,
  getToolBySlug,
  getToolsByCategory,
  tools,
} from "../../lib/tools/registry.js";

describe("tool registry", () => {
  test("contains the registered tool catalog", () => {
    expect(tools).toHaveLength(
      40
    );
  });

  test("can filter creator tools", () => {
    const creatorTools =
      getToolsByCategory(
        "CREATOR"
      );

    expect(
      creatorTools
    ).toHaveLength(5);
  });

  test("every tool has required fields", () => {
    for (const tool of tools) {
      expect(
        tool.id
      ).toBeTruthy();

      expect(
        tool.slug
      ).toBeTruthy();

      expect(
        tool.name
      ).toBeTruthy();

      expect(
        tool.category
      ).toBeTruthy();

      expect(
        tool.route
      ).toBeTruthy();

      expect(
        tool.engine
      ).toBeTruthy();

      expect(
        tool.inputTypes.length
      ).toBeGreaterThan(0);

      expect(
        tool.outputTypes.length
      ).toBeGreaterThan(0);

      expect(
        tool.quotaKey
      ).toBeTruthy();

      expect(
        tool.status
      ).toBeTruthy();

      expect(
        tool.priority
      ).toBeTruthy();
    }
  });

  test("tool IDs are unique", () => {
    const ids =
      tools.map(
        (tool) => tool.id
      );

    expect(
      new Set(ids).size
    ).toBe(ids.length);
  });

  test("tool slugs are unique", () => {
    const slugs =
      tools.map(
        (tool) =>
          tool.slug
      );

    expect(
      new Set(slugs).size
    ).toBe(
      slugs.length
    );
  });

  test("tool routes are unique", () => {
    const routes =
      tools.map(
        (tool) =>
          tool.route
      );

    expect(
      new Set(routes).size
    ).toBe(
      routes.length
    );
  });

  test("can find a tool by ID", () => {
    const tool =
      getToolById(
        "PDF-01"
      );

    expect(
      tool?.name
    ).toBe(
      "Photos to One PDF"
    );
  });

  test("can find a tool by slug", () => {
    const tool =
      getToolBySlug(
        "photos-to-one-pdf"
      );

    expect(
      tool?.id
    ).toBe("PDF-01");
  });

  test("can filter image tools", () => {
    const imageTools =
      getToolsByCategory(
        "IMAGE"
      );

    expect(
      imageTools
    ).toHaveLength(16);
  });

  test("can filter PDF tools", () => {
    const pdfTools =
      getToolsByCategory(
        "PDF"
      );

    expect(
      pdfTools
    ).toHaveLength(19);
  });

  test("completed tools are available and remaining tools are coming soon", () => {
    const availableToolIds = [
      "IMG-01",
      "IMG-02",
      "IMG-03",
      "IMG-04",
      "IMG-05",
      "IMG-06",
      "IMG-07",
      "IMG-08",
      "IMG-09",
      "IMG-10",
      "IMG-11",
      "IMG-12",
      "IMG-13",
      "IMG-14",
      "IMG-15",
      "IMG-16",

      "PDF-01",
      "PDF-02",
      "PDF-03",
      "PDF-04",
      "PDF-05",
      "PDF-06",
      "PDF-07",
      "PDF-08",
      "PDF-09",
      "PDF-10",
      "PDF-11",
      "PDF-13",
      "PDF-14",
      "PDF-17",
      "PDF-18",
      "PDF-19",

      "CRT-01",
      "CRT-02",
      "CRT-03",
      "CRT-04",
      "CRT-05",
      
    ];

    for (
      const toolId of
      availableToolIds
    ) {
      const tool =
        getToolById(
          toolId
        );

      expect(
        tool?.status
      ).toBe(
        TOOL_STATUS.AVAILABLE
      );
    }

    const unfinishedTools =
      tools.filter(
        (tool) =>
          !availableToolIds.includes(
            tool.id
          )
      );

    for (
      const tool of
      unfinishedTools
    ) {
      expect(
        tool.status
      ).toBe(
        TOOL_STATUS.COMING_SOON
      );
    }
  });
});