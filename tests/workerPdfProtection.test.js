import { describe, expect, test } from "bun:test";
import { Readable } from "node:stream";
import {
  createQpdfEncryptInput,
  readPdfPassword,
  validatePdfPassword,
} from "../worker/pdfProtection.mjs";

describe("PDF-15 protected PDF local worker", () => {
  const password = "SafeExample!2026"; // Test fixture only. Never use for real PDFs.
  const ownerPassword = "b".repeat(64);

  test("rejects weak, newline, or unsafe-leading passwords", () => {
    for (const value of ["short", "-dangerPassword123", "a\nAnotherPassword123", " leadingSpace123", "🔒mypassword1234", ""]) {
      expect(() => validatePdfPassword(value)).toThrow();
    }
    expect(validatePdfPassword(password)).toBe(password);
  });

  test("qpdf 256-bit encryption arguments go to stdin, not argv", () => {
    const input = createQpdfEncryptInput({
      inputPath: "/work/input/report.pdf",
      outputPath: "/work/output/report-protected.pdf",
      password,
      ownerPassword,
    });
    expect(input).toContain("\n256\n--\n");
    expect(input.split("\n")[1]).toBe(password);
    expect(input).toContain("/work/output/report-protected.pdf");
  });

  test("owner password must be strong and different", () => {
    expect(() => createQpdfEncryptInput({
      inputPath: "a", outputPath: "b", password, ownerPassword: "",
    })).toThrow();
  });

  test("reads a bounded password from stdin", async () => {
    const parsed = await readPdfPassword(Readable.from([Buffer.from(password + "\r\n")]));
    expect(parsed).toBe(password);
    await expect(readPdfPassword(Readable.from([Buffer.from("x".repeat(300))]))).rejects.toThrow();
  });
});
