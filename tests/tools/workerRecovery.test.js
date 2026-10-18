import { describe, expect, test } from "bun:test";
import {
  getRecoveryWhere,
  inspectStuckOfficeJob,
  isDockerMissingObjectError,
  isSafeRecoveryJobId,
  STALE_PROCESSING_MS,
} from "../../lib/worker/recoveryRules.mjs";

const now = Date.parse("2026-10-18T12:00:00Z");
const owner = "user_TestOwner12345";
const id = "cmi2fzgc60001w8yzoh6ivxae";
const oldDate = new Date(now - STALE_PROCESSING_MS - 60_000);
const base = () => ({
  id, ownerId: owner, toolId: "PDF-20", status: "PROCESSING",
  startedAt: oldDate, updatedAt: oldDate,
  inputRefs: { stage: "PROCESSING", verifiedKey: "do-not-display" },
});

describe("Phase 19B6 conservative manual recovery", () => {
  test("recognizes only safe job identifiers", () => {
    expect(isSafeRecoveryJobId(id)).toBe(true);
    expect(isSafeRecoveryJobId("../oops")).toBe(false);
  });
  test("lists an old processing Office job as a candidate only", () => {
    expect(inspectStuckOfficeJob(base(), owner, now).eligible).toBe(true);
  });
  test("never considers another owner's job eligible", () => {
    expect(inspectStuckOfficeJob(base(), "user_Another12345", now).eligible).toBe(false);
  });
  test("does not touch new or recently updated jobs", () => {
    expect(inspectStuckOfficeJob({ ...base(), startedAt: new Date(now) }, owner, now).eligible).toBe(false);
    expect(inspectStuckOfficeJob({ ...base(), updatedAt: new Date(now) }, owner, now).eligible).toBe(false);
  });
  test("does not touch completed, pending, or failed jobs", () => {
    for (const status of ["PENDING", "FAILED", "COMPLETED", "CANCELLED"]) {
      expect(inspectStuckOfficeJob({ ...base(), status }, owner, now).eligible).toBe(false);
    }
  });
  test("requires stage PROCESSING, matching Office tool and valid timestamps", () => {
    expect(inspectStuckOfficeJob({ ...base(), inputRefs: { stage: "READY_FOR_PROCESSING" } }, owner, now).eligible).toBe(false);
    expect(inspectStuckOfficeJob({ ...base(), toolId: "PDF-15" }, owner, now).eligible).toBe(false);
    expect(inspectStuckOfficeJob({ ...base(), startedAt: null }, owner, now).eligible).toBe(false);
  });
  test("generates atomic guarded update conditions", () => {
    const where = getRecoveryWhere(base(), owner, now);
    expect(where.ownerId).toBe(owner);
    expect(where.status).toBe("PROCESSING");
    expect(where.startedAt).toEqual(oldDate);
    expect(where.updatedAt).toEqual(oldDate);
    expect(where.inputRefs).toEqual({ path: ["stage"], equals: "PROCESSING" });
  });
  test("Docker missing-object errors are not confused with daemon failures", () => {
    expect(isDockerMissingObjectError("Error: No such object: ai-media-c... ")).toBe(true);
    expect(isDockerMissingObjectError("Cannot connect to the Docker daemon")).toBe(false);
    expect(isDockerMissingObjectError("")).toBe(false);
  });
});
