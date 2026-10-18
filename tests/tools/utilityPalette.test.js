import{describe,test,expect}from"bun:test";
import{rgbToHex,dominantPalette}from"../../lib/tools/utility/paletteRules.mjs";
describe("Phase20 palette",()=>{
 test("HEX correct",()=>{expect(rgbToHex(255,0,128)).toBe("#FF0080");expect(()=>rgbToHex(-1,1,1)).toThrow();});
 test("dominant colors",()=>{const a=new Uint8ClampedArray([255,0,0,255,255,0,0,255,0,0,255,255]);const p=dominantPalette(a,2);expect(p[0].hex).toBe("#FF0000");expect(p[0].count).toBe(2);});
});
