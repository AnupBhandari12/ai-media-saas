"use client";
// Deterministic, browser-only WF-09. Reuses IMG-08, IMG-03 and IMG-12 operations.
import {cropImage} from "../tools/image/cropImage.js";
import {resizeImageByPixels} from "../tools/image/resizeImageByPixels.js";
import {watermarkImage} from "../tools/image/watermarkImage.js";
import {runApprovedLocalSteps} from "./runLocalWorkflow.js";
import {ECOMMERCE_LIMITS,getEcommerceCrop,getEcommercePlan,validateEcommerceFile,
  validateEcommerceDimensions,ecommerceDownloadName,createEcommerceMetadata} from "./ecommerceProductPackPlan.js";

function checkAbort(signal) {
  if (signal?.aborted) throw new DOMException("Workflow cancelled.","AbortError");
}
async function dimensions(file) {
  let bitmap;
  try {bitmap=await createImageBitmap(file);} catch {throw new Error("Browser could not decode the image.");}
  try {return {width:bitmap.width,height:bitmap.height};} finally {bitmap.close();}
}
function verifyBlob(blob,expectedType="image/jpeg") {
  if (!(blob instanceof Blob) || blob.type!==expectedType || blob.size<1 ||
      blob.size>ECOMMERCE_LIMITS.maxOutputBytes) throw new Error("Invalid or oversized product image output.");
  return blob;
}
function fileFromBlob(blob,name) {return new File([blob],name,{type:blob.type});}
async function expectDimensions(file,width,height,api) {
  const observed=await api.dimensions(file);
  if (observed?.width!==width || observed?.height!==height) {
    throw new Error("Product output dimensions changed. Download blocked.");
  }
}
export async function runEcommerceProductPack(file,settings={}, {onStep,signal,adapters}={}) {
  validateEcommerceFile(file);
  const plan=getEcommercePlan(settings);
  checkAbort(signal);
  const api=adapters||{dimensions,crop:cropImage,resize:resizeImageByPixels,watermark:watermarkImage};
  if (![api.dimensions,api.crop,api.resize,api.watermark].every(fn=>typeof fn==="function")) {
    throw new Error("Required browser image processors are unavailable.");
  }
  const source=await api.dimensions(file);
  validateEcommerceDimensions(source?.width,source?.height);
  const crop=getEcommerceCrop(source,plan.config);
  const outputs=[];
  for (const target of plan.outputs) {
    checkAbort(signal);
    const operations={
      "IMG-08":async input=>{
        checkAbort(signal);
        const result=await api.crop(input,crop);
        checkAbort(signal);
        verifyBlob(result?.blob,input.type);
        if (result.width!==crop.width || result.height!==crop.height) throw new Error("Crop dimensions changed.");
        const out=fileFromBlob(result.blob,`product-crop.${input.type.split("/")[1]}`);
        await expectDimensions(out,crop.width,crop.height,api);
        return {file:out,status:"COMPLETED"};
      },
      "IMG-03":async input=>{
        checkAbort(signal);
        const result=await api.resize(input,target.size,target.size);
        checkAbort(signal);
        verifyBlob(result?.blob,input.type);
        if (result.width!==target.size || result.height!==target.size) throw new Error("Resize dimensions changed.");
        const resized=fileFromBlob(result.blob,"product-resized."+input.type.split("/")[1]);
        await expectDimensions(resized,target.size,target.size,api);
        // Reuse canvas conversion via existing Image tools only if source is JPG; PNG/WebP output
        // is preserved here and encoded as a lossless download with matching extension.
        return {file:resized,status:"COMPLETED"};
      },
      "IMG-12":async input=>{
        checkAbort(signal);
        if (!plan.config.watermarkText) return {file:input,status:"SKIPPED"};
        const result=await api.watermark(input,{type:"text",text:plan.config.watermarkText,
          position:"bottom-right",opacity:0.6,sizePercent:5,color:"#ffffff"});
        checkAbort(signal);
        verifyBlob(result?.blob,input.type);
        if (result.width!==target.size||result.height!==target.size) throw new Error("Watermark dimensions changed.");
        const marked=fileFromBlob(result.blob,"product-watermarked."+input.type.split("/")[1]);
        await expectDimensions(marked,target.size,target.size,api);
        return {file:marked,status:"COMPLETED"};
      },
    };
    const result=await runApprovedLocalSteps({steps:plan.steps,input:file,operations,
      onStep:event=>onStep?.({...event,variant:target.id}),signal});
    checkAbort(signal);
    verifyBlob(result.file,result.file.type);
    await expectDimensions(result.file,target.size,target.size,api);
    checkAbort(signal);
    const extension={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[result.file.type];
    if (!extension) throw new Error("Unsupported product output format.");
    outputs.push(Object.freeze({variant:target.id,label:target.label,blob:result.file,
      filename:ecommerceDownloadName(file.name,target.id).replace(/\.jpg$/,`.${extension}`),
      width:target.size,height:target.size,bytes:result.file.size,mimeType:result.file.type,
      trace:result.trace}));
  }
  const metadata=createEcommerceMetadata({sourceName:file.name,config:plan.config,outputs});
  const textBlob=new Blob([metadata],{type:"text/plain;charset=utf-8"});
  return Object.freeze({workflowId:"WF-09",variantId:"image",processingMode:"BROWSER_LOCAL",
    config:plan.config,original:Object.freeze({...source,bytes:file.size}),outputs:Object.freeze(outputs),
    metadata:Object.freeze({blob:textBlob,filename:ecommerceDownloadName(file.name,"metadata")}),
    aiBackgroundRemoval:false,remoteProcessing:false});
}
