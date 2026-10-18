import { describe, expect, test } from "bun:test";
import { buildQrPayload, validateQrSize } from "../../lib/tools/utility/qrRules.mjs";
describe("Phase20 QR safety",()=>{
 test("https URL and printable text",()=>{expect(buildQrPayload("URL",{url:"https://example.com"})).toBe("https://example.com/");expect(buildQrPayload("TEXT",{text:"hello"})).toBe("hello");});
 test("rejects dangerous schemes and unsupported types",()=>{expect(()=>buildQrPayload("URL",{url:"javascript:alert(1)"})).toThrow();expect(()=>buildQrPayload("NO",{})).toThrow();});
 test("escapes WIFI fields",()=>{expect(buildQrPayload("WIFI",{ssid:"Cafe;5G",password:"ab:c",encryption:"WPA"})).toContain("S:Cafe\\;5G;");});
 test("avoids contact injection",()=>{expect(()=>buildQrPayload("CONTACT",{name:"A\nB",phone:"123"})).toThrow();expect(buildQrPayload("CONTACT",{name:"Alice",phone:"123"})).toContain("BEGIN:VCARD");});
 test("allowlisted image size",()=>{expect(validateQrSize("512")).toBe(512);expect(()=>validateQrSize(513)).toThrow();});
});
