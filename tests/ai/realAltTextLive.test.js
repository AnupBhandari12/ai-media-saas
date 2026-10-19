import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { verifyVisionImage } from "../../lib/ai/runRealAltText.mjs";

const route = readFileSync(new URL("../../app/api/ai/real/alt-text/route.js", import.meta.url), "utf8");
const workflow = readFileSync(new URL("../../lib/ai/runRealAltText.mjs", import.meta.url), "utf8");
const client = readFileSync(new URL("../../components/ai/RealAltTextLab.jsx", import.meta.url), "utf8");

test("real vision requires separate operator switch and shared paid approval before auth", () => {
  expect(route.indexOf("AI_REAL_ALT_TEXT_ENABLED")).toBeLessThan(route.indexOf("await auth()"));
  expect(route).toContain("AI_REAL_SPEND_APPROVED");
});
test("real vision checks authenticated owner, origin and upload bounds", () => {
  expect(route).toContain("isAuthenticated"); expect(route).toContain('ownerId: userId');
  expect(route).toContain('request.headers.get("origin")'); expect(route).toContain("MAX_REQUEST_BYTES");
});
test("real vision validates full decoded pixels before budget debit", () => {
  expect(workflow.indexOf("await verifyVisionImage(image)")).toBeLessThan(workflow.indexOf("await reserveAiAction("));
  expect(workflow).toContain("decodeBackgroundImageWithSharp");
});
test("real vision requires shared quota and the ALT_TEXT budget before provider dispatch", () => {
  expect(workflow.indexOf("reserveAiAction(")).toBeLessThan(workflow.indexOf("requestRealAltText("));
  expect(workflow).toContain("AI_BUDGET_RESERVATION_MICROS.ALT_TEXT");
});
test("real vision marks uncertain results UNKNOWN, never auto retries", () => {
  expect(workflow).toContain("markAiActionUnknown");
  expect(workflow).toContain("requireBudgeted: true");
  expect(workflow).not.toContain("setTimeout");
});
test("vision rejects mismatched and tiny bytes without decoding", async () => {
  let called = false;
  await expect(verifyVisionImage({ bytes: new Uint8Array(3), mimeType: "image/png", decode: () => { called = true; }})).rejects.toThrow("INVALID_VISION_IMAGE");
  expect(called).toBe(false);
});
test("vision only takes server-decoded dimensions and hashes supplied image", async () => {
  const image = await verifyVisionImage({
    bytes: new Uint8Array(64), mimeType: "image/png",
    decode: async () => ({ width: 2, height: 2, pixels: new Uint8Array(16) }),
  });
  expect(image.width).toBe(2); expect(image.height).toBe(2);
  expect(image.fingerprint).toMatch(/^[a-f0-9]{64}$/);
});
test("vision denies false decoded pixels and oversized dimensions", async () => {
  await expect(verifyVisionImage({ bytes: new Uint8Array(64), mimeType: "image/png",
    decode: async () => ({ width: 5000, height: 1, pixels: new Uint8Array(20000) }) })).rejects.toThrow();
});
test("real image upload is opt-in and not part of the local mock workflow", () => {
  expect(client).toContain('"/api/ai/real/alt-text"');
  expect(client).toContain("Billable when enabled");
});
