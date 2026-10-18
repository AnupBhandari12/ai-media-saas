import { describe, expect, test } from "bun:test";
import { validateUtilityImage, safeUtilityFilename, assertImageDimensions, formatUtilityBytes } from "../../lib/tools/utility/common.mjs";

describe("Phase20 utility foundation", () => {
  test("bounds images and dimensions", () => {
    expect(validateUtilityImage({ type: "image/png", size: 128 }).size).toBe(128);
    expect(() => validateUtilityImage({ type: "image/svg+xml", size: 128 })).toThrow();
    expect(() => assertImageDimensions(7000, 7000)).toThrow();
    expect(() => assertImageDimensions(2000, 2000)).not.toThrow();
  });
  test("safe local filenames", () => {
    expect(safeUtilityFilename("my photo.png", ".zip")).toBe("my-photo.zip");
    expect(() => safeUtilityFilename("x", "../../exe")).toThrow();
    expect(formatUtilityBytes(1024)).toContain("KiB");
  });
});
