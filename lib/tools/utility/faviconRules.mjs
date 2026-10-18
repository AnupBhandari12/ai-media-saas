export const ICON_SIZES = Object.freeze([16,32,48,180,192,512]);
export function validateIconSize(value){
 const size=Number(value);if(!ICON_SIZES.includes(size))throw new Error("Unsupported icon size.");return size;
}
// .ico file containing a PNG image for modern browsers.
export function makePngIco(pngBytes,width=32,height=32){
 validateIconSize(width);validateIconSize(height);
 if(!(pngBytes instanceof Uint8Array)||pngBytes.length<20)throw new Error("Invalid PNG icon.");
 const signature=[137,80,78,71,13,10,26,10];
 if(!signature.every((b,i)=>pngBytes[i]===b))throw new Error("Invalid PNG data.");
 const header=new Uint8Array(22);const v=new DataView(header.buffer);
 v.setUint16(0,0,true);v.setUint16(2,1,true);v.setUint16(4,1,true);
 header[6]=width===256?0:width;header[7]=height===256?0:height;
 header[8]=0;header[9]=0;v.setUint16(10,1,true);v.setUint16(12,32,true);
 v.setUint32(14,pngBytes.length,true);v.setUint32(18,22,true);
 const output=new Uint8Array(header.length+pngBytes.length);output.set(header);output.set(pngBytes,header.length);return output;
}
