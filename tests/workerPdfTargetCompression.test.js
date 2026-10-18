import { describe, expect, test } from "bun:test";
import {
  IMAGE_RESOLUTIONS_DPI,
  createGhostscriptArgs,
  parseTargetKiB,
  pickSmallerCandidate,
} from "../worker/pdfTargetCompression.mjs";

describe("PDF-12 target PDF compression local worker", () => {
  test("accepts integer target KiB in bounded range", () => {
    expect(parseTargetKiB("50")).toBe(50);
    expect(parseTargetKiB("500")).toBe(500);
    expect(parseTargetKiB("25600")).toBe(25600);
  });

  test("rejects invalid, injected and out-of-range targets", () => {
    for (const raw of [undefined, "", "0", "49", "25601", "5.5", "-60", "+60", "80;rm -rf", " 500", "0500", "1e3"]) {
      expect(() => parseTargetKiB(raw)).toThrow();
    }
  });

  test("Ghostscript arguments use an allowlisted DPI and fixed switches", () => {
    const args = createGhostscriptArgs(
      "/work/input/scanned.pdf", "/work/output/.target-temp/result.pdf", 120,
    );
    expect(args).toContain("-dSAFER");
    expect(args).toContain("-sDEVICE=pdfwrite");
    expect(args).toContain("-dColorImageResolution=120");
    expect(args).toContain("-sOutputFile=/work/output/.target-temp/result.pdf");
    expect(args.slice(-2)).toEqual(["-f", "/work/input/scanned.pdf"]);
  });

  test("refuses arbitrary DPI and out-of-scope paths", () => {
    expect(IMAGE_RESOLUTIONS_DPI).toEqual([170, 120, 85]);
    expect(() => createGhostscriptArgs(
      "/work/input/scanned.pdf", "/work/output/temp/result.pdf", 300,
    )).toThrow();
    expect(() => createGhostscriptArgs(
      "/etc/private.pdf", "/work/output/temp/result.pdf", 120,
    )).toThrow();
    expect(() => createGhostscriptArgs(
      "/work/input/scanned.pdf", "/tmp/result.pdf", 120,
    )).toThrow();
  });

  test("preserves smaller result instead of a larger generated PDF", () => {
    const original = { file: "original", bytes: 100_000, dpi: null };
    const winner = pickSmallerCandidate(original, { file: "medium", bytes: 80_000, dpi: 120 });
    expect(winner.bytes).toBe(80_000);
    expect(pickSmallerCandidate(winner, { file: "bad", bytes: 110_000, dpi: 85 })).toBe(winner);
  });

  test("rejects candidates with impossible sizes", () => {
    expect(() => pickSmallerCandidate({ bytes: 42 }, { bytes: 0 })).toThrow();
    expect(() => pickSmallerCandidate({ bytes: 42 }, { bytes: -1 })).toThrow();
  });
});
