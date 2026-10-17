import { describe, expect, test } from "bun:test";

import {
  OFFICE_UI_MAX_BYTES,
  canCancelOfficeJob,
  getOfficeJobMessage,
  getOfficeUiTool,
  validateOfficeSelection,
} from "../../lib/worker/officeUiConfig.js";

describe("Phase 19B4 Office conversion UI rules", () => {
  test("maps the three supported tool IDs to the right formats", () => {
    expect(getOfficeUiTool("PDF-20").accept).toBe(".doc,.docx");
    expect(getOfficeUiTool("PDF-21").accept).toBe(".ppt,.pptx");
    expect(getOfficeUiTool("PDF-22").accept).toBe(".xls,.xlsx");
    expect(getOfficeUiTool("PDF-12")).toBeNull();
  });

  test("validates filenames, types and actual sizes", () => {
    expect(validateOfficeSelection("PDF-20", { name: "essay.DOCX", size: 1200 })).toBeNull();
    expect(validateOfficeSelection("PDF-20", { name: "slides.pptx", size: 1200 })).toBeTruthy();
    expect(validateOfficeSelection("PDF-20", { name: "../secret.docx", size: 1200 })).toBeTruthy();
    expect(validateOfficeSelection("PDF-20", { name: "essay.docx", size: 0 })).toBeTruthy();
    expect(validateOfficeSelection("PDF-20", { name: "essay.docx", size: OFFICE_UI_MAX_BYTES + 1 })).toBeTruthy();
  });

  test("only allows cancellation of eligible pending jobs", () => {
    expect(canCancelOfficeJob({ status: "PENDING", stage: "READY_FOR_PROCESSING" })).toBe(true);
    expect(canCancelOfficeJob({ status: "PENDING", stage: "UPLOADING" })).toBe(true);
    expect(canCancelOfficeJob({ status: "PROCESSING", stage: "PROCESSING" })).toBe(false);
    expect(canCancelOfficeJob({ status: "COMPLETED", stage: "COMPLETED" })).toBe(false);
  });

  test("does not claim that an uploaded job runs automatically", () => {
    expect(getOfficeJobMessage({ status: "PENDING", stage: "READY_FOR_PROCESSING" }))
      .toContain("local developer worker");
    expect(getOfficeJobMessage({ status: "COMPLETED", stage: "COMPLETED" }))
      .toContain("PDF is ready");
  });
});
