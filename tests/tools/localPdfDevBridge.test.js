import { describe, test, expect } from "bun:test";
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  requireDevBridgeSettings,
  authorizedDevToken,
  validateDevOperation,
  validateDevPassword,
  createPdfFramingDecoder,
  buildLocalDockerArgs,
  MAX_DEV_PDF_BYTES,
} from "../../lib/worker/localPdfDevRules.mjs";
import {
  DEV_PDF_UI,
  makeDevPdfDownloadName,
  validateDevPdfSelection,
} from "../../lib/worker/localPdfDevUiConfig.js";

async function decode(parts, max = MAX_DEV_PDF_BYTES) {
  const result = [];
  const decoder = createPdfFramingDecoder(max);
  await pipeline(Readable.from(parts), decoder.transform, new Writable({
    write(chunk, _enc, done) { result.push(Buffer.from(chunk)); done(); },
  }));
  return { bytes: decoder.pdfBytes, password: decoder.password(), file: Buffer.concat(result) };
}

function encoded(password, file = "%PDF-1.7\n") {
  const secret = Buffer.from(password, "utf8");
  const header = Buffer.alloc(2);
  header.writeUInt16BE(secret.length);
  return Buffer.concat([header, secret, Buffer.from(file)]);
}

describe("Phase 19B7 loopback-only PDF development bridge", () => {
  test("requires explicit opt-in and disallows production/hosted", () => {
    expect(() => requireDevBridgeSettings({ LOCAL_PDF_DEV_BRIDGE_ENABLED: "true", NODE_ENV: "production" })).toThrow();
    expect(() => requireDevBridgeSettings({ LOCAL_PDF_DEV_BRIDGE_ENABLED: "true", VERCEL: "1" })).toThrow();
    expect(() => requireDevBridgeSettings({ LOCAL_PDF_DEV_BRIDGE_ENABLED: "false" })).toThrow();
    expect(requireDevBridgeSettings({ LOCAL_PDF_DEV_BRIDGE_ENABLED: "true" }).origin).toBe("http://localhost:3000");
    expect(() => requireDevBridgeSettings({ LOCAL_PDF_DEV_BRIDGE_ENABLED: "true", LOCAL_PDF_DEV_ORIGIN: "https://example.com" })).toThrow();
  });

  test("validates short-lived token and rejects malformed bearer input", () => {
    const secret = "a".repeat(64);
    expect(authorizedDevToken(`Bearer ${secret}`, secret)).toBe(true);
    expect(authorizedDevToken(`Bearer ${"b".repeat(64)}`, secret)).toBe(false);
    expect(authorizedDevToken(secret, secret)).toBe(false);
    expect(authorizedDevToken(`Bearer ${"x".repeat(400)}`, secret)).toBe(false);
  });

  test("permits only the four planned tool operations", () => {
    expect(validateDevOperation("compress-target", "1500").outputFilename).toBe("input-target.pdf");
    expect(validateDevOperation("protect", null).outputFilename).toBe("input-protected.pdf");
    expect(validateDevOperation("unlock", null).outputFilename).toBe("input-unlocked.pdf");
    expect(validateDevOperation("repair", null).outputFilename).toBe("input-normalized.pdf");
    for (const op of ["exec", "convert", "health", "..", ""]) {
      expect(() => validateDevOperation(op, null)).toThrow();
    }
  });

  test("accepts bounded target but blocks unsafe or invalid input", () => {
    expect(validateDevOperation("compress-target", "50").targetKiB).toBe(50);
    expect(validateDevOperation("compress-target", "25600").targetKiB).toBe(25600);
    for (const value of ["0", "49", "25601", "-1", "1500;rm", "010", "1.5", null]) {
      expect(() => validateDevOperation("compress-target", value)).toThrow();
    }
    expect(() => validateDevOperation("unlock", "1000")).toThrow();
  });

  test("keeps password policies and raw password separate from command arguments", () => {
    expect(validateDevPassword("protect", "StrongExample!2026")).toBe("StrongExample!2026");
    expect(validateDevPassword("unlock", "नेपालीPass")).toBe("नेपालीPass");
    expect(validateDevPassword("compress-target", "")).toBe("");
    expect(validateDevPassword("repair", "")).toBe("");
    expect(() => validateDevPassword("repair", "not-empty")).toThrow();
    for (const val of ["weak", "-FlagInjectionExample123", "Bad\nPassword12345", "🔒SecretPassword2026"]) {
      expect(() => validateDevPassword("protect", val)).toThrow();
    }
    expect(() => validateDevPassword("unlock", "")).toThrow();
    expect(() => validateDevPassword("compress-target", "something")).toThrow();
  });

  test("streams password prefix and PDF across arbitrary chunks", async () => {
    const payload = encoded("StrongExample!2026", "%PDF-1.7\nmore content");
    const chunks = [...payload].map(byte => Buffer.from([byte]));
    const result = await decode(chunks);
    expect(result.password).toBe("StrongExample!2026");
    expect(result.file.toString("utf8")).toBe("%PDF-1.7\nmore content");
    expect(result.bytes).toBe(Buffer.byteLength("%PDF-1.7\nmore content"));
  });

  test("supports zero-length password for compression", async () => {
    const data = await decode([encoded("")]);
    expect(data.password).toBe("");
    expect(data.file.toString()).toBe("%PDF-1.7\n");
  });

  test("rejects oversized password prefix, truncated body and oversized file", async () => {
    await expect(decode([Buffer.from([1, 1]), Buffer.from("%PDF-1.7\n")])).rejects.toThrow();
    await expect(decode([Buffer.from([0, 10]), Buffer.from("short")])).rejects.toThrow();
    await expect(decode([encoded("", "%PDF-1.7\nextra")], 8)).rejects.toThrow();
  });

  test("Docker is allowlisted, isolated, and never gets secret as argv", () => {
    const args = buildLocalDockerArgs({
      jobDirectory: "D:\\ai-media\\worker\\local-files\\pdf-dev-xyz",
      operation: "compress-target", targetKiB: 1500,
      containerName: "ai-media-pdf-dev-" + "a".repeat(24),
    });
    expect(args).toContain("none");
    expect(args).toContain("--read-only");
    expect(args).toContain("no-new-privileges:true");
    expect(args.slice(-3)).toEqual(["compress-target", "input.pdf", "1500"]);
    expect(args.join(" ")).not.toContain("StrongExample!2026");
    expect(() => buildLocalDockerArgs({
      jobDirectory: "X", operation: "unknown", containerName: "ai-media-pdf-dev-" + "b".repeat(24),
    })).toThrow();
  });

  test("repair bridge uses a fixed Docker allowlisted command without password", () => {
    const args = buildLocalDockerArgs({
      jobDirectory: "D:\\ai-media\\worker\\local-files\\pdf-dev-abc",
      operation: "repair",
      containerName: "ai-media-pdf-dev-" + "c".repeat(24),
    });
    expect(args.slice(-2)).toEqual(["repair", "input.pdf"]);
    expect(args).toContain("none");
  });

  test("new page configurations exist without changing public registry", () => {
    expect(Object.keys(DEV_PDF_UI).sort()).toEqual(["PDF-12", "PDF-15", "PDF-16", "PDF-30"]);
    expect(validateDevPdfSelection({ name: "sample.pdf", size: 1024 })).toBe(null);
    expect(validateDevPdfSelection({ name: "../../secrets.pdf", size: 500 })).not.toBe(null);
    expect(validateDevPdfSelection({ name: "document.docx", size: 500 })).not.toBe(null);
    expect(validateDevPdfSelection({ name: "sample.pdf", size: MAX_DEV_PDF_BYTES + 1 })).not.toBe(null);
    expect(makeDevPdfDownloadName("my doc.pdf", "-protected.pdf")).toBe("my-doc-protected.pdf");
  });
});
