import { describe, expect, test } from "bun:test";

import {
  DOCUMENT_MIME,
  getDocumentMime,
  makeUploadKey,
  makeVerifiedKey,
  matchesOfficeSignature,
} from "../../lib/worker/uploadRules.js";

const UUID = "38b1e64e-1148-47a5-8c4a-4bacd498a9b7";
const JOB = "cmi2fzgc60001w8yzoh6ivxae";

describe("Phase 19B2 private document upload rules", () => {
  test("canonical content types for all Office formats", () => {
    expect(Object.keys(DOCUMENT_MIME)).toHaveLength(6);
    expect(getDocumentMime(".docx")).toContain("wordprocessingml.document");
    expect(getDocumentMime(".exe")).toBeNull();
  });

  test("storage keys are generated from server IDs, not filenames", () => {
    expect(makeUploadKey(JOB, ".docx", UUID)).toBe(`uploads/${JOB}/${UUID}.docx`);
    expect(makeVerifiedKey(JOB, ".docx", UUID)).toBe(`verified/${JOB}/${UUID}.docx`);
  });

  test("rejects invalid storage key arguments", () => {
    expect(() => makeUploadKey("../abc", ".docx", UUID)).toThrow();
    expect(() => makeUploadKey(JOB, ".exe", UUID)).toThrow();
  });

  test("Office OpenXML uses ZIP signature", () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    expect(matchesOfficeSignature(".docx", zip)).toBe(true);
    expect(matchesOfficeSignature(".pptx", zip)).toBe(true);
    expect(matchesOfficeSignature(".xlsx", zip)).toBe(true);
    expect(matchesOfficeSignature(".doc", zip)).toBe(false);
  });

  test("legacy Office files use OLE signature", () => {
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(matchesOfficeSignature(".doc", ole)).toBe(true);
    expect(matchesOfficeSignature(".ppt", ole)).toBe(true);
    expect(matchesOfficeSignature(".xls", ole)).toBe(true);
    expect(matchesOfficeSignature(".docx", ole)).toBe(false);
  });

  test("rejects truncated, spoofed, or unsupported content", () => {
    expect(matchesOfficeSignature(".docx", new Uint8Array([0x50, 0x4b]))).toBe(false);
    expect(matchesOfficeSignature(".docx", new Uint8Array(8))).toBe(false);
    expect(matchesOfficeSignature(".pdf", new Uint8Array(8))).toBe(false);
  });
});
