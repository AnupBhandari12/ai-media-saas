import { describe, expect, test } from "bun:test";
import {
  dockerConversionArguments,
  makeResultKey,
  requireOfficeSignature,
  validateReadyJob,
} from "../../lib/worker/executionRules.js";

const JOB_ID = "cmi2fzgc60001w8yzoh6ivxae";
const NONCE = "38b1e64e-1148-47a5-8c4a-4bacd498a9b7";

function ready(overrides = {}) {
  return {
    id: JOB_ID,
    toolId: "PDF-20",
    status: "PENDING",
    inputRefs: {
      stage: "READY_FOR_PROCESSING",
      filename: "Annual Report.docx",
      extension: ".docx",
      expectedBytes: 4096,
      verifiedBytes: 4096,
      verifiedKey: `verified/${JOB_ID}/${NONCE}.docx`,
    },
    ...overrides,
  };
}

describe("Phase 19B3 trusted local worker execution rules", () => {
  test("accepts a confirmed privately stored Office document", () => {
    expect(validateReadyJob(ready())).toEqual({
      extension: ".docx",
      verifiedKey: `verified/${JOB_ID}/${NONCE}.docx`,
      bytes: 4096,
      inputFilename: `${JOB_ID}.docx`,
      outputFilename: `${JOB_ID}.pdf`,
    });
  });
  test("rejects unconfirmed and already-processed jobs", () => {
    expect(() => validateReadyJob(ready({ status: "COMPLETED" }))).toThrow();
    expect(() => validateReadyJob(ready({ inputRefs: {
      ...ready().inputRefs, stage: "UPLOADING",
    }}))).toThrow();
  });
  test("prevents verified object key substitution", () => {
    expect(() => validateReadyJob(ready({ inputRefs: {
      ...ready().inputRefs,
      verifiedKey: `verified/another-user/${NONCE}.docx`,
    }}))).toThrow();
    expect(() => validateReadyJob(ready({ inputRefs: {
      ...ready().inputRefs,
      verifiedKey: `uploads/${JOB_ID}/${NONCE}.docx`,
    }}))).toThrow();
  });
  test("checks exact verified byte count and tool type", () => {
    expect(() => validateReadyJob(ready({ inputRefs: {
      ...ready().inputRefs, verifiedBytes: 2000,
    }}))).toThrow();
    expect(() => validateReadyJob(ready({ toolId: "PDF-21" }))).toThrow();
  });
  test("rejects malformed archive signature", () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4]);
    expect(() => requireOfficeSignature(".docx", zip)).not.toThrow();
    expect(() => requireOfficeSignature(".docx", new Uint8Array(8))).toThrow();
  });
  test("results use server-generated opaque paths", () => {
    expect(makeResultKey(JOB_ID, NONCE)).toBe(`results/${JOB_ID}/${NONCE}.pdf`);
    expect(() => makeResultKey("../unsafe", NONCE)).toThrow();
  });
  test("Docker has no network and a per-job mount", () => {
    const args = dockerConversionArguments({
      jobId: JOB_ID,
      hostDirectory: "D:\\ai-media\\worker\\local-files\\jobs\\" + JOB_ID,
      inputFilename: `${JOB_ID}.docx`,
    });
    expect(args).toContain("none");
    expect(args).toContain("--read-only");
    expect(args).toContain("--cap-drop");
    expect(args).toContain("no-new-privileges:true");
    expect(args).toContain("--mount");
    expect(args.at(-2)).toBe("convert");
    expect(args.at(-1)).toBe(`${JOB_ID}.docx`);
  });
  test("Docker refuses unsafe filenames", () => {
    expect(() => dockerConversionArguments({
      jobId: JOB_ID, hostDirectory: "D:\\ai-media", inputFilename: "../secret.docx",
    })).toThrow();
  });
});
