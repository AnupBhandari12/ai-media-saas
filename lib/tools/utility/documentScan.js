import {validateUtilityImage,assertImageDimensions} from "./common.mjs";
import {sourceHomography,scanOutputSize,enhanceScanPixel,validateCorners} from "./scannerMath.mjs";

export async function createDocumentScan(file,corners,mode="ENHANCE"){
 validateUtilityImage(file,10*1024*1024);validateCorners(corners);
 const bitmap=await createImageBitmap(file);
 try{
  assertImageDimensions(bitmap.width,bitmap.height);
  const source=document.createElement("canvas");source.width=bitmap.width;source.height=bitmap.height;
  const src=source.getContext("2d",{willReadFrequently:true});if(!src)throw new Error("Canvas unavailable.");
  src.drawImage(bitmap,0,0);
  const {data:input}=src.getImageData(0,0,source.width,source.height);
  const size=scanOutputSize(corners,source.width,source.height),toSource=sourceHomography(corners,source.width,source.height);
  const target=document.createElement("canvas");target.width=size.width;target.height=size.height;
  const out=target.getContext("2d");const image=out.createImageData(size.width,size.height);
  for(let py=0;py<size.height;py++)for(let px=0;px<size.width;px++){
   const [sx,sy]=toSource(px/(size.width-1),py/(size.height-1));
   const x=Math.max(0,Math.min(source.width-1,sx)),y=Math.max(0,Math.min(source.height-1,sy));
   const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(source.width-1,x0+1),y1=Math.min(source.height-1,y0+1);
   const tx=x-x0,ty=y-y0;const channel=c=>{
    const a=input[(y0*source.width+x0)*4+c],b=input[(y0*source.width+x1)*4+c],
      d=input[(y1*source.width+x0)*4+c],e=input[(y1*source.width+x1)*4+c];
    return Math.round((a*(1-tx)+b*tx)*(1-ty)+(d*(1-tx)+e*tx)*ty);
   };
   const [r,g,b]=enhanceScanPixel(channel(0),channel(1),channel(2),mode);
   const at=(py*size.width+px)*4;image.data[at]=r;image.data[at+1]=g;image.data[at+2]=b;image.data[at+3]=255;
  }
  out.putImageData(image,0,0);
  return new Promise((resolve,reject)=>target.toBlob(blob=>blob?resolve({blob,width:size.width,height:size.height}):reject(new Error("Unable to export scan.")),"image/jpeg",0.9));
 }finally{bitmap.close();}
}
