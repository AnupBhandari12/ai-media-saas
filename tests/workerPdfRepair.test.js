import { describe, expect, test } from "bun:test";
import {
  pdfRepairCommand,
  validatedRepairRequest,
} from "../worker/pdfRepair.mjs";

const input = "/work/input/sample.pdf";
const output = "/work/output/sample-normalized.pdf";

describe("PDF-30 safe repair/normalize worker", () => {
  test("validates PDF-30 action and exact normalized output naming", () => {
    expect(validatedRepairRequest({
      action: "repair", filename: "sample.pdf", outputFilename: "sample-normalized.pdf",
    }).filename).toBe("sample.pdf");
  });
  test("refuses arbitrary actions, original-output overwrite and non-PDF extensions", () => {
    for (const request of [
      { action: "convert", filename: "sample.pdf", outputFilename: "sample-normalized.pdf" },
      { action: "repair", filename: "sample.pdf", outputFilename: "sample.pdf" },
      { action: "repair", filename: "sample.docx", outputFilename: "sample-normalized.pdf" },
    ]) expect(() => validatedRepairRequest(request)).toThrow();
  });
  test("rejects traversal and unsupported file names", () => {
    for (const name of ["../secret.pdf", "folder/secret.pdf", "a..b.pdf", "--flags.pdf", "a.pdf;rm", "a.pdf\n--help"])
      expect(() => validatedRepairRequest({ action: "repair", filename: name, outputFilename: "safe-normalized.pdf" })).toThrow();
  });
  test("qpdf command uses a fixed rewriter and absolute paths", () => {
    expect(pdfRepairCommand("qpdf", input, output)).toEqual({
      command: "qpdf",
      args: ["--warning-exit-0", "--object-streams=disable", "--", input, output],
    });
  });
  test("Ghostscript only accepts a fixed safe fallback command", () => {
    const call = pdfRepairCommand("ghostscript", input, output);
    expect(call.command).toBe("gs");
    expect(call.args).toContain("-dSAFER");
    expect(call.args).toContain("-dBATCH");
    expect(call.args).toContain(`-sOutputFile=${output}`);
    expect(call.args.slice(-2)).toEqual(["-f", input]);
  });
  test("refuses arbitrary executable and paths outside private workspace", () => {
    expect(() => pdfRepairCommand("bash", input, output)).toThrow();
    expect(() => pdfRepairCommand("qpdf", "/etc/passwd", output)).toThrow();
    expect(() => pdfRepairCommand("qpdf", input, "/tmp/result.pdf")).toThrow();
    expect(() => pdfRepairCommand("qpdf", input, "/work/output/../../root/secret.pdf")).toThrow();
  });
});
