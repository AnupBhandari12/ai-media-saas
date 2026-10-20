"use client";
// WF-05 thumbnail: CRT-04 local canvas renderer + IMG-02 local target-size compressor.
// Remote logos, saved Brand Kit, video, providers and API endpoints are NEVER enabled.
import {createYouTubeThumbnail} from "../tools/creator/createYouTubeThumbnail.js";
import {compressToTargetSize} from "../tools/image/compressToTargetSize.js";
import {runApprovedLocalSteps} from "./runLocalWorkflow.js";
import {getYouTubeReadyPlan, createYouTubeReadyFilename, validateYouTubeReadyFile,
  validateYouTubeReadyDimensions, YOUTUBE_READY_LIMITS} from "./youtubeReadyPlan.js";

function checkAbort(signal) {
  if (signal?.aborted) throw new DOMException("Workflow cancelled.", "AbortError");
}
async function decodeDimensions(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("Browser could not decode the selected image."); }
  try { return {width: bitmap.width, height: bitmap.height}; }
  finally { bitmap.close(); }
}
function validateJpeg(blob) {
  if (!(blob instanceof Blob) || blob.type !== "image/jpeg" || blob.size < 1 ||
      blob.size > YOUTUBE_READY_LIMITS.maxOutputBytes) {
    throw new Error("Thumbnail processor returned an unsupported or oversized JPG output.");
  }
  return blob;
}
function expect1280x720(dimensions) {
  if (dimensions?.width !== YOUTUBE_READY_LIMITS.width || dimensions?.height !== YOUTUBE_READY_LIMITS.height) {
    throw new Error("Thumbnail dimensions changed. Download blocked to preserve 1280 × 720 pixels.");
  }
}

export async function runYouTubeReady(file, settings = {}, {onStep, signal, adapters} = {}) {
  validateYouTubeReadyFile(file);
  const plan = getYouTubeReadyPlan(settings);
  checkAbort(signal);
  const api = adapters || {dimensions: decodeDimensions, thumbnail: createYouTubeThumbnail,
    compress: compressToTargetSize};
  if (![api.dimensions, api.thumbnail, api.compress].every((fn) => typeof fn === "function")) {
    throw new Error("Required browser thumbnail processors are unavailable.");
  }
  const source = await api.dimensions(file);
  validateYouTubeReadyDimensions(source?.width, source?.height);
  checkAbort(signal);

  const operations = {
    "CRT-04": async (input) => {
      checkAbort(signal);
      // Explicitly opt OUT of remote Brand Kit loading; no provider or network dependencies.
      const options = {settings: {...plan.config, outputFormat: "jpg", useBrandKit:false,
        showLogo:false, overlayOpacity:65, titleColor:"#ffffff",primaryColor:"#4f46e5",
        secondaryColor:"#0891b2"},brandKit:null};
      const output = await api.thumbnail(input, options);
      checkAbort(signal);
      validateJpeg(output?.blob);
      expect1280x720(output);
      const generated = new File([output.blob], "youtube-intermediate.jpg", {type:"image/jpeg"});
      expect1280x720(await api.dimensions(generated));
      checkAbort(signal);
      return {file:generated,status:"COMPLETED"};
    },
    "IMG-02": async (input) => {
      checkAbort(signal);
      if (input.size <= plan.config.targetKb * 1024) {
        return {file:input,status:"SKIPPED"};
      }
      const output = await api.compress(input, plan.config.targetKb);
      checkAbort(signal);
      validateJpeg(output?.blob);
      // The shared target compressor may SCALE the image to reach KB goal.
      // A YouTube thumbnail must remain 1280×720, so fail closed instead of accepting that output.
      expect1280x720(output);
      const compressed = new File([output.blob], "youtube-compressed.jpg", {type:"image/jpeg"});
      expect1280x720(await api.dimensions(compressed));
      checkAbort(signal);
      return {file:compressed,status:"COMPLETED"};
    },
  };
  const output = await runApprovedLocalSteps({steps:plan.steps,input:file,operations,onStep,signal});
  checkAbort(signal);
  validateJpeg(output.file);
  const finalSize = await api.dimensions(output.file);
  expect1280x720(finalSize);
  checkAbort(signal);
  return Object.freeze({
    blob:output.file,
    filename:createYouTubeReadyFilename(file.name),
    processingMode:"BROWSER_LOCAL", variantId:"thumbnail",
    original:Object.freeze({...source,bytes:file.size,mimeType:file.type}),
    result:Object.freeze({width:1280,height:720,bytes:output.file.size,mimeType:"image/jpeg",
      targetBytes:plan.config.targetKb*1024,reachedTarget:output.file.size<=plan.config.targetKb*1024,
      youtubeAcceptanceVerified:false, videoEnabled:false, remoteBrandKitUsed:false}),
    config:plan.config, trace:output.trace,
  });
}
