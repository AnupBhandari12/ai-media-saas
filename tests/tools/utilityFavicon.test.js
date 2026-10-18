import{describe,test,expect}from"bun:test";
import{ICON_SIZES,validateIconSize,makePngIco}from"../../lib/tools/utility/faviconRules.mjs";
describe("Phase 20 favicon",()=>{
 test("standard icon sizes only",()=>{expect(ICON_SIZES).toContain(512);expect(validateIconSize(32)).toBe(32);expect(()=>validateIconSize(31)).toThrow();});
 test("ICO header embeds PNG bytes safely",()=>{const png=new Uint8Array([...([137,80,78,71,13,10,26,10]),...new Array(25).fill(0)]);const ico=makePngIco(png);expect(ico[2]).toBe(1);expect(ico[6]).toBe(32);expect(ico.length).toBe(55);expect(()=>makePngIco(new Uint8Array(40))).toThrow();});
});
