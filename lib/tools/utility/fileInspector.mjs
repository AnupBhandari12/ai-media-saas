export const INSPECTOR_MAX_BYTES = 20 * 1024 * 1024;
const ascii = (bytes, offset, len) => String.fromCharCode(...bytes.subarray(offset,offset+len));
export function detectFileKind(header){
 if (!(header instanceof Uint8Array))throw new Error("Invalid file header.");
 if(header.length>=8&&[137,80,78,71,13,10,26,10].every((x,i)=>header[i]===x))return "PNG image";
 if(header[0]===255&&header[1]===216&&header[2]===255)return "JPEG image";
 if(ascii(header,0,4)==="RIFF"&&ascii(header,8,4)==="WEBP")return "WebP image";
 if(ascii(header,0,4)==="GIF8")return "GIF image";
 if(ascii(header,0,5)==="%PDF-")return "PDF document";
 if(header[0]===80&&header[1]===75&&(header[2]===3||header[2]===5||header[2]===7))return "ZIP / Office OpenXML archive";
 if(ascii(header,0,4)==="RIFF"&&ascii(header,8,4)==="WAVE")return "WAV audio";
 if(ascii(header,0,3)==="ID3"||(header[0]===255&&(header[1]&0xe0)===0xe0))return "MP3 audio";
 if(ascii(header,4,4)==="ftyp")return "MP4-family media";
 if(header[0]===0x1a&&header[1]===0x45&&header[2]===0xdf&&header[3]===0xa3)return "WebM / Matroska media";
 return "Unknown / unsupported format";
}
export function pngDimensions(bytes){
 if(detectFileKind(bytes)!=="PNG image"||bytes.length<24)return null;
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const w=v.getUint32(16,false),h=v.getUint32(20,false);
 return w>0&&h>0&&w<=50000&&h<=50000?{width:w,height:h}:null;
}
export function containsExifMarker(header){
 if(detectFileKind(header)!=="JPEG image")return false;
 for(let i=0;i+9<header.length;i++){
  if(header[i]===0xff&&header[i+1]===0xe1&&ascii(header,i+4,4)==="Exif")return true;
 }
 return false;
}
export function inspectFileHeader(header,file){
 if(!file||!Number.isSafeInteger(file.size)||file.size<1||file.size>INSPECTOR_MAX_BYTES)throw new Error("Choose a file under 20 MiB.");
 const detected=detectFileKind(header);
 return {name:String(file.name||"unnamed").slice(0,180),size:file.size,
  claimedMime:String(file.type||"Not provided"),detected,modified:file.lastModified?new Date(file.lastModified).toLocaleString():"Unknown",
  dimensions:pngDimensions(header),exifMarker:containsExifMarker(header)};
}
