import{describe,expect,test}from"bun:test";
import{defaultCorners,validateCorners,sourceHomography,scanOutputSize,enhanceScanPixel}from"../../lib/tools/utility/scannerMath.mjs";
describe("Phase20 scanner geometry",()=>{
 test("identity rectangle",()=>{const map=sourceHomography([[0,0],[1,0],[1,1],[0,1]],101,101);expect(map(0,0)[0]).toBeCloseTo(0);expect(map(1,1)[1]).toBeCloseTo(100);});
 test("rejects self-crossing quadrilateral",()=>{expect(()=>validateCorners([[0,0],[1,1],[1,0],[0,1]])).toThrow();});
 test("safe capped output",()=>{let size=scanOutputSize(defaultCorners(),5000,4000);expect(size.width*size.height).toBeLessThanOrEqual(2500000);});
 test("enhancement has safe grayscale",()=>{expect(enhanceScanPixel(100,100,100,"GRAYSCALE")).toEqual([100,100,100]);expect(()=>enhanceScanPixel(1,2,3,"CUSTOM")).toThrow();});
});
