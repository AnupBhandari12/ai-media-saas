import {describe,test,expect} from "bun:test";
import {validateOcrLanguage,normalizeOcrProgress,cleanOcrText} from "../../lib/tools/utility/ocrRules.mjs";
describe("Phase 20 OCR rules",()=>{
 test("English, Nepali, combined",()=>{expect(validateOcrLanguage("eng").label).toBe("English");expect(validateOcrLanguage("nep").label).toBe("Nepali");expect(validateOcrLanguage("eng+nep").languages).toEqual(["eng","nep"]);expect(()=>validateOcrLanguage("../../lang")).toThrow();});
 test("progress bounds and normalization",()=>{expect(normalizeOcrProgress(0.45)).toBe(45);expect(normalizeOcrProgress(3)).toBe(100);expect(normalizeOcrProgress(NaN)).toBe(0);expect(cleanOcrText("a\r\nb ")).toBe("a\nb");});
});
