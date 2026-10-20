import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { CANONICAL_PROMPTS } from "../../lib/ai-workspace/canonicalPrompts.js";
import {
  HISTORY_LIMIT, TASK_STATUSES, publicHistoryRecord,
  validHistoryId, validateHistoryPatch, validateHistorySave,
} from "../../lib/ai-workspace/historyContract.js";
import { historyHeaders, validHistoryOrigin, readHistoryJson } from "../../lib/ai-workspace/historyHttp.js";

const request = (body, { origin = "https://app.test", contentType = "application/json" } = {}) =>
  new Request("https://app.test/api/ai-workspace/history", {
    method: "POST", headers: { "content-type": contentType, origin },
    body: JSON.stringify(body),
  });

describe("Phase 23 Stage 06 — optional owner-owned history", () => {
  test("canonical workflows can save only registered metadata, with no execution grants", () => {
    expect(HISTORY_LIMIT).toBe(30);
    expect(TASK_STATUSES).toEqual(["SAVED", "IN_PROGRESS", "DONE"]);
    for (const { workflowId, variantId } of CANONICAL_PROMPTS) {
      expect(validateHistorySave({ prompt: "  A photo please  ", workflowId, variantId })).toEqual({
        prompt: "A photo please", workflowId, variantId, taskStatus: "SAVED",
      });
    }
  });
  test("rejects model-supplied commands, owner IDs, steps, URLs, flags and prototype tricks", () => {
    const base = { prompt: "My website image", workflowId: "WF-06", variantId: "image" };
    for (const extra of [
      { ownerId: "victim" }, { steps: ["IMG-99"] }, { command: "shell" },
      { executable: true }, { costUsd: 100 }, { url: "https://evil.test" },
      { file: "image bytes" }, { taskStatus: "DONE" },
    ]) expect(() => validateHistorySave({ ...base, ...extra })).toThrow();
    for (const bad of [null, [], new Date(), Object.create({ prompt: "x" }),
      { ...base, workflowId: "WF-99" }, { ...base, variantId: "video" },
      { ...base, prompt: "x".repeat(501) }, { ...base, prompt: 12 },
    ]) expect(() => validateHistorySave(bad)).toThrow();
  });
  test("task changes accept only one manual status; never mark actual processing results", () => {
    for (const taskStatus of TASK_STATUSES) expect(validateHistoryPatch({ taskStatus })).toEqual({ taskStatus });
    for (const bad of [null, {}, { taskStatus: "PROCESSING" }, { taskStatus: "DONE", ownerId: "victim" },
      { taskStatus: "DONE", executable: true }, { taskStatus: true }]) {
      expect(() => validateHistoryPatch(bad)).toThrow();
    }
  });
  test("IDs are bounded and strictly validated", () => {
    expect(validHistoryId("cm" + "a".repeat(23))).toBe(true);
    for (const id of ["../secrets", "", "123", "w_1", "c" + "A".repeat(25), null, 123]) {
      expect(validHistoryId(id)).toBe(false);
    }
  });
  test("public response contains only non-sensitive metadata; no ownerId returned", () => {
    const item = publicHistoryRecord({
      id: "cm" + "a".repeat(23), ownerId: "sensitive-owner", prompt: "A photo", workflowId: "WF-06",
      variantId: "image", taskStatus: "IN_PROGRESS", createdAt: new Date("2026-10-20T00:00:00Z"),
      secureUrl: "sensitive", cloudinaryPublicId: "secret",
    });
    expect(item).not.toHaveProperty("ownerId");
    expect(item).not.toHaveProperty("secureUrl");
    expect(item).not.toHaveProperty("cloudinaryPublicId");
    expect(item.workflowHref).toBe("/workflows/website-ready");
  });
  test("mutations must be same-origin; body is JSON and byte bounded", async () => {
    expect(validHistoryOrigin(request({ prompt: "x" }))).toBe(true);
    expect(validHistoryOrigin(request({ prompt: "x" }, { origin: "https://evil.test" }))).toBe(false);
    expect(historyHeaders["Cache-Control"]).toContain("no-store");
    const parsed = await readHistoryJson(request({ prompt: "x", workflowId: "WF-06", variantId: "image" }));
    expect(parsed.workflowId).toBe("WF-06");
    await expect(readHistoryJson(request({ prompt: "x".repeat(4000) }))).rejects.toThrow();
    await expect(readHistoryJson(request({ prompt: "x" }, { contentType: "text/plain" }))).rejects.toThrow();
  });
  test("routes apply Clerk authentication, owner filters and same-origin to all writes", () => {
    const list = readFileSync("app/api/ai-workspace/history/route.js", "utf8");
    const item = readFileSync("app/api/ai-workspace/history/[id]/route.js", "utf8");
    for (const source of [list, item]) {
      expect(source).toContain("await auth()");
      expect(source).toContain("validHistoryOrigin(request)");
      expect(source).toContain("ownerId");
      expect(source).not.toContain("process.env.OPENAI_API_KEY");
    }
    expect(list).toContain("where: { ownerId }");
    expect(list).toContain("HISTORY_LIMIT");
    expect(item).toContain("where: { id: guard.id, ownerId: guard.ownerId }");
    expect(item).toContain("deleteMany(");
    expect(item).toContain("updateMany(");
  });
  test("history UI is opt-in, user-controlled, and cannot call the processing engine", () => {
    const view = readFileSync("components/ai-workspace/WorkspaceHistoryPanel.jsx", "utf8");
    const host = readFileSync("components/ai-workspace/AiWorkspaceUnderstanding.jsx", "utf8");
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    expect(view).toContain("Save current plan (opt-in)");
    expect(view).toContain("window.confirm");
    expect(view).toContain('method: "PATCH"');
    expect(view).toContain('method: "DELETE"');
    expect(view).not.toContain("runWorkspaceWebsiteReady");
    expect(view).not.toContain("Ask AI (may use credits)");
    expect(host).toContain("<WorkspaceHistoryPanel");
    expect(schema).toContain("model WorkspaceHistory {");
    expect(schema).toContain("@@index([ownerId, createdAt])");
    expect(schema).not.toContain("WorkspaceHistory GeneratedAsset");
  });
});
