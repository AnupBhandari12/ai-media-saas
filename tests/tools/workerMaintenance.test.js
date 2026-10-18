import { describe, expect, test } from "bun:test";
import {
  assertDevOwner, assertAutoDispatchEnabled, assertCleanupAllowed,
  makeCleanupPlan, isResultExpired, safeWorkerKey, TEMP_RETENTION_MS,
  RESULT_RETENTION_MS,
} from "../../lib/worker/maintenanceRules.mjs";

const NOW = Date.parse("2026-10-18T12:00:00Z");
const ID = "cmi2fzgc60001w8yzoh6ivxae";
const UUID = "38b1e64e-1148-47a5-8c4a-4bacd498a9b7";
const dateBefore = ms => new Date(NOW - ms - 1000);
const goodEnv = {
  WORKER_JOBS_ENABLED: "true", WORKER_UPLOADS_ENABLED: "true",
  WORKER_EXECUTION_ENABLED: "true", WORKER_DEV_OWNER_ID: "user_2AbcdEfgh12345",
};
const job = (overrides = {}) => ({
  id: ID, ownerId: goodEnv.WORKER_DEV_OWNER_ID, toolId: "PDF-20",
  status: "PENDING", createdAt: dateBefore(TEMP_RETENTION_MS),
  updatedAt: dateBefore(TEMP_RETENTION_MS),
  inputRefs: { stage: "UPLOADING", storageKey: `uploads/${ID}/${UUID}.docx` },
  ...overrides,
});

describe("Phase 19B5 local worker safety and retention", () => {
  test("local owner scope requires all three worker flags", () => {
    expect(assertDevOwner(goodEnv)).toBe(goodEnv.WORKER_DEV_OWNER_ID);
    expect(() => assertDevOwner({ ...goodEnv, WORKER_UPLOADS_ENABLED: "false" })).toThrow();
  });
  test("rejects hosted runtimes and missing/invalid Clerk identity", () => {
    expect(() => assertDevOwner({ ...goodEnv, VERCEL: "1" })).toThrow();
    expect(() => assertDevOwner({ ...goodEnv, NODE_ENV: "production" })).toThrow();
    expect(() => assertDevOwner({ ...goodEnv, WORKER_DEV_OWNER_ID: "" })).toThrow();
  });
  test("automation is opt-in; cleanup application is separately opt-in", () => {
    expect(() => assertAutoDispatchEnabled(goodEnv)).toThrow();
    expect(assertAutoDispatchEnabled({ ...goodEnv, WORKER_AUTO_DISPATCH_ENABLED: "true" })).toBe(goodEnv.WORKER_DEV_OWNER_ID);
    expect(assertCleanupAllowed(goodEnv, false)).toBe(goodEnv.WORKER_DEV_OWNER_ID);
    expect(() => assertCleanupAllowed(goodEnv, true)).toThrow();
    expect(assertCleanupAllowed({ ...goodEnv, WORKER_CLEANUP_ENABLED: "true" }, true)).toBe(goodEnv.WORKER_DEV_OWNER_ID);
  });
  test("storage cleanup only permits exact job IDs and canonical key namespaces", () => {
    expect(safeWorkerKey(ID, "upload", `uploads/${ID}/${UUID}.docx`)).toBe(true);
    expect(safeWorkerKey(ID, "verified", `verified/${ID}/${UUID}.pptx`)).toBe(true);
    expect(safeWorkerKey(ID, "result", `results/${ID}/${UUID}.pdf`)).toBe(true);
    expect(safeWorkerKey(ID, "upload", `results/${ID}/${UUID}.pdf`)).toBe(false);
    expect(safeWorkerKey(ID, "verified", `verified/not-the-job/${UUID}.docx`)).toBe(false);
    expect(safeWorkerKey(ID, "result", `results/${ID}/../../../secrets.pdf`)).toBe(false);
  });
  test("expires only stale unconfirmed upload reservations", () => {
    const plan = makeCleanupPlan(job(), NOW);
    expect(plan.expirePending).toBe(true);
    expect(plan.keys).toEqual([{ kind: "upload", key: `uploads/${ID}/${UUID}.docx` }]);
  });
  test("fresh uploads do not expire even if original reservation date was old", () => {
    const plan = makeCleanupPlan(job({ updatedAt: new Date(NOW) }), NOW);
    expect(plan.expirePending).toBe(false);
    expect(plan.keys).toEqual([]);
  });
  test("pending confirmed and processing jobs never have files deleted", () => {
    const verified = `verified/${ID}/${UUID}.docx`;
    const inputRefs = { ...job().inputRefs, stage: "READY_FOR_PROCESSING", verifiedKey: verified };
    expect(makeCleanupPlan(job({ inputRefs }), NOW).keys).toEqual([]);
    expect(makeCleanupPlan(job({ status: "PROCESSING", inputRefs }), NOW).keys).toEqual([]);
  });
  test("completed jobs keep final results until seven days", () => {
    const completed = job({ status: "COMPLETED", completedAt: dateBefore(TEMP_RETENTION_MS), resultRefs: { storageKey: `results/${ID}/${UUID}.pdf` } });
    expect(makeCleanupPlan(completed, NOW).keys.some(k => k.kind === "result")).toBe(false);
    expect(isResultExpired(completed, NOW)).toBe(false);
  });
  test("completed jobs at seven days can expire valid results", () => {
    const completed = job({ status: "COMPLETED", completedAt: dateBefore(RESULT_RETENTION_MS), resultRefs: { storageKey: `results/${ID}/${UUID}.pdf` } });
    expect(isResultExpired(completed, NOW)).toBe(true);
    expect(makeCleanupPlan(completed, NOW).keys.some(k => k.kind === "result")).toBe(true);
  });
  test("expired result flag avoids repeat cleanup", () => {
    const completed = job({ status: "COMPLETED", completedAt: dateBefore(RESULT_RETENTION_MS), resultRefs: { storageKey: `results/${ID}/${UUID}.pdf`, expired: true } });
    expect(makeCleanupPlan(completed, NOW).keys.some(k => k.kind === "result")).toBe(false);
  });
  test("failed jobs can remove verified temporary copies after 72h", () => {
    const failed = job({ status: "FAILED", completedAt: dateBefore(TEMP_RETENTION_MS), inputRefs: { ...job().inputRefs, verifiedKey: `verified/${ID}/${UUID}.docx` } });
    expect(makeCleanupPlan(failed, NOW).keys.map(k => k.kind)).toEqual(["upload", "verified"]);
  });
  test("unknown keys and unrecognized statuses are never removed", () => {
    expect(makeCleanupPlan(job({ status: "PROCESSING" }), NOW).keys).toEqual([]);
    expect(makeCleanupPlan(job({ inputRefs: { stage: "UPLOADING", storageKey: "other/danger.txt" } }), NOW).keys).toEqual([]);
  });
});
