// Phase 23 / Stage 02: conservative, offline text intent classification.
// This is NOT an LLM or a processing engine. No network, upload, tokens, or jobs.
import { CANONICAL_PROMPTS, normalizeCanonicalPrompt } from "./canonicalPrompts.js";
import { createWorkspacePlanFromPrompt, validateWorkspacePlan } from "./planContract.js";
import { getWorkflowById } from "../workflows/registry.js";

export const UNDERSTANDING_EXAMPLES = Object.freeze([
  { prompt: "Resize this photo for my website", workflowId: "WF-06", label: "Website image" },
  { prompt: "Make my WhatsApp picture smaller", workflowId: "WF-01", label: "WhatsApp photo" },
  { prompt: "Crop this image for Instagram", workflowId: "WF-02", label: "Instagram photo" },
  { prompt: "Prepare my Facebook picture", workflowId: "WF-03", label: "Facebook photo" },
  { prompt: "Optimize a LinkedIn post image", workflowId: "WF-04", label: "LinkedIn post" },
  { prompt: "Make a thumbnail image for YouTube", workflowId: "WF-05", label: "YouTube thumbnail" },
  { prompt: "Make this email attachment image smaller", workflowId: "WF-07", label: "Email image" },
  { prompt: "Prepare a passport photo for my job application", workflowId: "WF-08", label: "Job photo" },
  { prompt: "Create a product image pack for my online store", workflowId: "WF-09", label: "Product pack" },
  { prompt: "Turn my lecture photos into PDF notes", workflowId: "WF-10", label: "Student notes PDF" },
].map((item) => Object.freeze(item)));

const INTENTS = Object.freeze([
  { workflowId: "WF-01", variantId: "image", marker: /\bwhatsapp\b/ },
  { workflowId: "WF-02", variantId: "image", marker: /\b(?:instagram|insta)\b/ },
  { workflowId: "WF-03", variantId: "image", marker: /\bfacebook\b/ },
  { workflowId: "WF-04", variantId: "post", marker: /\b(?:linkedin|linked in)\b/ },
  { workflowId: "WF-05", variantId: "thumbnail", marker: /\b(?:youtube|you tube)\b/ },
  { workflowId: "WF-06", variantId: "image", marker: /\b(?:website|web site|webpage|web page)\b/ },
  { workflowId: "WF-07", variantId: "image", marker: /\b(?:email|e mail)\b/ },
  { workflowId: "WF-08", variantId: "photo", marker: /\b(?:job application|job form|passport photo|passport picture|id photo|id picture)\b/ },
  { workflowId: "WF-09", variantId: "image", marker: /\b(?:ecommerce|e commerce|online store|online shop|product image pack|product photo pack)\b/ },
  { workflowId: "WF-10", variantId: "photos", marker: /\b(?:student notes|study notes|pdf notes|notes pdf|photos? (?:to|into) pdf|images? (?:to|into) pdf|photos? (?:to|into) (?:a )?(?:numbered )?pdf|images? (?:to|into) (?:a )?(?:numbered )?pdf)\b/ },
]);

const IMAGE = /\b(?:photo|photos|picture|pictures|image|images)\b/;
const PDF = /\bpdf\b/;
const UNSUPPORTED = /\b(?:video|reels?|audio|voice|podcast|mp4|ocr|scan|scanned|summariz(?:e|ing)|transcrib(?:e|ing)|word|powerpoint|pptx?|excel|xlsx?|delete|erase|bypass|provider|shell|terminal|command|publish|upload|send|execute)\b|\b(?:ignore (?:previous |all )?instructions|remove background|background removal|post to|api key)\b/;
const EXPLICIT_SETTING = /\b\d+(?:\.\d+)?\s*(?:kb|mb|gb|px|pixels|dpi)\b|\b\d+\s*x\s*\d+\b/;

function clarify(question) {
  return Object.freeze({ kind: "NEEDS_CLARIFICATION", question });
}

// One question at a time; no automatic guessing or selection when ambiguous.
export function understandWorkspacePrompt(prompt) {
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 500) {
    return clarify("Which media output do you want? Please describe one image or photos-to-PDF result.");
  }
  const exact = CANONICAL_PROMPTS.find((item) =>
    normalizeCanonicalPrompt(item.prompt) === normalizeCanonicalPrompt(prompt));
  if (exact) {
    return createWorkspacePlanFromPrompt(prompt);
  }
  const text = normalizeCanonicalPrompt(prompt).replace(/[^a-z0-9]+/g, " ").trim();
  const matches = INTENTS.filter((intent) => intent.marker.test(text));
  if (matches.length > 1) {
    return clarify("You mentioned multiple destinations. Which ONE output should I prepare first?");
  }
  if (matches.length === 0) {
    return clarify("Which output is this for: WhatsApp, Instagram, Facebook, LinkedIn, YouTube thumbnail, website, email, job photo, product pack, or photos-to-PDF notes?");
  }
  const target = matches[0];
  if (UNSUPPORTED.test(text)) {
    return clarify("This sounds like an unsupported or automatic action. Do you want an approved local photo workflow or photos-to-PDF notes instead?");
  }
  if (EXPLICIT_SETTING.test(text)) {
    return clarify("You requested an exact size or setting. Please use the existing workflow to configure that value; do you want to preview its default workflow plan?");
  }
  if (PDF.test(text) && target.workflowId !== "WF-10") {
    return clarify("This Workspace preview only supports PDF notes made from photos. Are you preparing photos or a different PDF document?");
  }
  if (target.workflowId === "WF-10") {
    if (!IMAGE.test(text) || !PDF.test(text)) {
      return clarify("Are your notes in photos/images that you want combined into a PDF?");
    }
  } else if (target.workflowId === "WF-05") {
    if (!/\bthumbnail\b/.test(text)) {
      return clarify("Do you want a YouTube thumbnail image? Video processing is not part of this preview.");
    }
  } else if (!IMAGE.test(text)) {
    return clarify("Are you preparing a photo/image for this destination? Other media variants are not enabled here yet.");
  }
  if (target.workflowId === "WF-04" && /\bprofile\b/.test(text)) {
    return clarify("This preview supports LinkedIn post images, not profile variants. Do you want a post image?");
  }
  if (target.workflowId === "WF-09" && !/\b(?:product|store|shop|ecommerce|e commerce)\b/.test(text)) {
    return clarify("Do you want a product photo pack for an online store?");
  }
  // Always reconstruct the exact registered steps and enforce the Stage 01 contract.
  // Never copy tool IDs, commands, settings or provider instructions from the prompt.
  const workflow = getWorkflowById(target.workflowId);
  const variant = workflow?.variants.find((item) => item.id === target.variantId);
  if (!variant) return clarify("That workflow variant is unavailable. Which supported output would you like?");
  const verified = validateWorkspacePlan({
    workflowId: target.workflowId,
    variantId: target.variantId,
    steps: [...variant.steps],
  });
  const plan = Object.freeze({ ...verified, source: "DETERMINISTIC_INTENT" });
  return Object.freeze({ kind: "PLAN", plan });
}
