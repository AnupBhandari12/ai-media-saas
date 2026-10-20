// WF-09 deterministic image branch only. AI cleanup and bulk jobs remain preview-only.
import {getWorkflowById} from "./registry.js";

export const ECOMMERCE_STEPS = Object.freeze(["IMG-08", "IMG-03", "IMG-12"]);
export const ECOMMERCE_OUTPUTS = Object.freeze([
  Object.freeze({id:"catalog",label:"Square catalog image",size:1200}),
  Object.freeze({id:"web",label:"Web listing image",size:800}),
]);
export const ECOMMERCE_LIMITS = Object.freeze({
  maxInputBytes:10*1024*1024,maxDimension:8000,maxPixels:20_000_000,
  minSquareSide:1200,maxOutputBytes:15*1024*1024,
});
const ALLOWED_TYPES = ["image/jpeg","image/png","image/webp"];
const KEYS = ["productName","altText","watermarkText","focusX","focusY"];

export function normalizeEcommerceSettings(settings={}) {
  if (!settings || Array.isArray(settings) || typeof settings!=="object" ||
      Object.keys(settings).some(key=>!KEYS.includes(key))) {
    throw new Error("Unsupported product pack settings.");
  }
  const productName = settings.productName ?? "Product photo";
  const altText = settings.altText ?? "Square photo of the product";
  const watermarkText = settings.watermarkText ?? "";
  const focusX = settings.focusX ?? 50;
  const focusY = settings.focusY ?? 50;
  if (typeof productName!=="string" || productName.trim().length<2 || productName.trim().length>90 ||
      /[\x00-\x1f\x7f]/.test(productName)) throw new Error("Product name must be 2–90 characters.");
  if (typeof altText!=="string" || altText.trim().length<5 || altText.trim().length>180 ||
      /[\x00-\x1f\x7f]/.test(altText)) throw new Error("Alt text must be 5–180 characters.");
  if (typeof watermarkText!=="string" || watermarkText.length>50 || /[\x00-\x1f\x7f]/.test(watermarkText)) {
    throw new Error("Watermark text must contain at most 50 valid characters.");
  }
  if (![focusX,focusY].every(n=>Number.isInteger(n)&&n>=0&&n<=100)) {
    throw new Error("Crop focus must be between 0 and 100.");
  }
  return Object.freeze({productName:productName.trim(),altText:altText.trim(),
    watermarkText:watermarkText.trim(),focusX,focusY});
}
export function validateEcommerceFile(file) {
  if (!file || typeof file.name!=="string" || !file.name.trim() ||
      !Number.isSafeInteger(file.size) || file.size<1 || file.size>ECOMMERCE_LIMITS.maxInputBytes ||
      !ALLOWED_TYPES.includes(file.type)) throw new Error("Choose a non-empty JPG, PNG or WebP photo up to 10 MB.");
  return file;
}
export function validateEcommerceDimensions(width,height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width<ECOMMERCE_LIMITS.minSquareSide || height<ECOMMERCE_LIMITS.minSquareSide ||
      width>ECOMMERCE_LIMITS.maxDimension || height>ECOMMERCE_LIMITS.maxDimension ||
      width*height>ECOMMERCE_LIMITS.maxPixels) {
    throw new Error("Use a product photo at least 1200 × 1200 px (max 20 megapixels); no upscaling.");
  }
  return Object.freeze({width,height});
}
export function getEcommerceCrop(source,settings={}) {
  const {width,height}=validateEcommerceDimensions(source?.width,source?.height);
  const {focusX,focusY}=normalizeEcommerceSettings(settings);
  const squareSide=Math.min(width,height);
  return Object.freeze({x:Math.round((width-squareSide)*focusX/100),
    y:Math.round((height-squareSide)*focusY/100),width:squareSide,height:squareSide});
}
export function getEcommercePlan(settings={}) {
  const config=normalizeEcommerceSettings(settings);
  const variant=getWorkflowById("WF-09")?.variants.find(v=>v.id==="image");
  if (!variant || variant.steps.length!==ECOMMERCE_STEPS.length ||
      variant.steps.some((step,index)=>step!==ECOMMERCE_STEPS[index])) {
    throw new Error("E-commerce image workflow differs from approved registry.");
  }
  return Object.freeze({workflowId:"WF-09",variantId:"image",processingMode:"BROWSER_LOCAL",
    steps:ECOMMERCE_STEPS,outputs:ECOMMERCE_OUTPUTS,config});
}
export function ecommerceFileStem(filename) {
  return String(filename).replace(/\.[^.]*$/,"").replace(/[^a-zA-Z0-9_-]/g,"-")
    .replace(/-+/g,"-").slice(0,60).replace(/^-+|-+$/g,"")||"product";
}
export function ecommerceDownloadName(filename,variant) {
  if (!["catalog","web","metadata"].includes(variant)) throw new Error("Unsupported product pack output.");
  return `${ecommerceFileStem(filename)}-product-${variant}.${variant==="metadata"?"txt":"jpg"}`;
}
export function createEcommerceMetadata({sourceName,config,outputs}) {
  const safeName=String(sourceName).replace(/[\r\n\x00-\x1f\x7f]/g," ").slice(0,120);
  return ["AI Media | E-commerce Product Pack",`Product: ${config.productName}`,
    `Alt text: ${config.altText}`,`Original file: ${safeName}`,
    "Background removal: Not performed (AI feature unavailable)",
    `Watermark: ${config.watermarkText?"Applied: "+config.watermarkText:"None"}`,
    ...outputs.map(o=>`${o.variant}: ${o.width}x${o.height} JPG • ${o.bytes} bytes`),
    "Note: Check marketplace requirements and verify product image accuracy before posting.",""].join("\n");
}
