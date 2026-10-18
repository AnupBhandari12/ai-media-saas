import{describe,expect,test}from"bun:test";
import{detectFileKind,inspectFileHeader,pngDimensions,containsExifMarker}from"../../lib/tools/utility/fileInspector.mjs";
describe("Phase20 file inspector",()=>{
 test("signatures independent of user MIME",()=>{expect(detectFileKind(Uint8Array.from([37,80,68,70,45,49]))).toBe("PDF document");expect(detectFileKind(Uint8Array.from([0,0]))).toContain("Unknown");});
 test("PNG dimensions",()=>{const a=new Uint8Array(24);a.set([137,80,78,71,13,10,26,10]);const v=new DataView(a.buffer);v.setUint32(16,600,false);v.setUint32(20,400,false);expect(pngDimensions(a)).toEqual({width:600,height:400});});
 test("file size limits and safe unknown",()=>{expect(()=>inspectFileHeader(new Uint8Array(9),{size:30*1024*1024})).toThrow();expect(containsExifMarker(new Uint8Array(8))).toBe(false);});
});
