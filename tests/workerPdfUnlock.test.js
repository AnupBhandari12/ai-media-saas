import { describe, expect, test } from "bun:test";
import { Readable } from "node:stream";
import {
  validateUnlockPassword,
  readUnlockPassword,
  createQpdfUnlockArgs,
} from "../worker/pdfUnlock.mjs";

describe("PDF-16 known-password local PDF unlock", () => {
  test("allows short older PDF passwords and Unicode text", () => {
    expect(validateUnlockPassword("abc")).toBe("abc");
    expect(validateUnlockPassword("SafeExample!2026")).toBe("SafeExample!2026");
    expect(validateUnlockPassword("नेपाली2026")).toBe("नेपाली2026");
  });

  test("rejects empty, control, line-break and oversized password", () => {
    for (const input of ["", "a\nb", "a\rb", "a\0b", "x".repeat(129)]) {
      expect(() => validateUnlockPassword(input)).toThrow();
    }
  });

  test("preserves existing password spaces and bounds stdin", async () => {
    const password = " known password ";
    expect(await readUnlockPassword(Readable.from([Buffer.from(password + "\r\n")]))).toBe(password);
    await expect(readUnlockPassword(Readable.from([Buffer.from("x".repeat(513))]))).rejects.toThrow();
  });

  test("qpdf decrypt arguments use password-file stdin, not argv", () => {
    const args = createQpdfUnlockArgs(
      "/work/input/sample-protected.pdf",
      "/work/output/sample-protected-unlocked.pdf",
    );
    expect(args).toEqual([
      "--password-file=-", "--decrypt", "--",
      "/work/input/sample-protected.pdf",
      "/work/output/sample-protected-unlocked.pdf",
    ]);
    expect(args.join(" ")).not.toContain("SecretExample");
  });

  test("rejects path traversal and out-of-scope paths", () => {
    expect(() => createQpdfUnlockArgs(
      "/work/input/../secret.pdf", "/work/output/result.pdf",
    )).toThrow();
    expect(() => createQpdfUnlockArgs(
      "/tmp/sample.pdf", "/work/output/result.pdf",
    )).toThrow();
  });
});
