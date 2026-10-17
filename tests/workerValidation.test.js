import { describe, expect, test } from "bun:test";

import {
  validateWorkerRequest,
} from "../worker/validation.mjs";

describe("Phase 19A document worker", () => {
  test("supports health checks", () => {
    expect(validateWorkerRequest("health")).toEqual({
      action: "health",
    });
  });

  test("accepts DOCX conversion", () => {
    const request = validateWorkerRequest("convert", "report.docx");

    expect(request.extension).toBe(".docx");
    expect(request.outputFilename).toBe("report.pdf");
  });

  test("accepts PPTX and XLSX conversion", () => {
    expect(
      validateWorkerRequest("convert", "slides.pptx").outputFilename,
    ).toBe("slides.pdf");

    expect(
      validateWorkerRequest("convert", "data.xlsx").outputFilename,
    ).toBe("data.pdf");
  });

  test("accepts PDF validation", () => {
    expect(validateWorkerRequest("check", "sample.pdf").extension).toBe(
      ".pdf",
    );
  });

  test("blocks path traversal", () => {
    expect(() =>
      validateWorkerRequest("check", "../secret.pdf"),
    ).toThrow();

    expect(() =>
      validateWorkerRequest("check", "folder/file.pdf"),
    ).toThrow();
  });

  test("blocks unsupported input formats", () => {
    expect(() =>
      validateWorkerRequest("convert", "script.js"),
    ).toThrow();

    expect(() =>
      validateWorkerRequest("check", "document.docx"),
    ).toThrow();
  });
});
