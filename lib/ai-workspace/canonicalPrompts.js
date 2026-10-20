// Phase 23 Stage 01: deterministic examples, not AI interpretations.
// Each example targets an EXISTING Phase 22 browser-local beta variant.
export const CANONICAL_PROMPTS = Object.freeze([
  { workflowId: "WF-01", variantId: "image", prompt: "Make this photo WhatsApp ready", label: "WhatsApp photo" },
  { workflowId: "WF-02", variantId: "image", prompt: "Prepare this photo for Instagram", label: "Instagram photo" },
  { workflowId: "WF-03", variantId: "image", prompt: "Prepare this image for Facebook", label: "Facebook photo" },
  { workflowId: "WF-04", variantId: "post", prompt: "Make this image LinkedIn post ready", label: "LinkedIn post" },
  { workflowId: "WF-05", variantId: "thumbnail", prompt: "Create a YouTube thumbnail from my photo", label: "YouTube thumbnail" },
  { workflowId: "WF-06", variantId: "image", prompt: "Optimize this image for my website", label: "Website image" },
  { workflowId: "WF-07", variantId: "image", prompt: "Compress this picture for email", label: "Email image" },
  { workflowId: "WF-08", variantId: "photo", prompt: "Make a job application photo", label: "Job form photo" },
  { workflowId: "WF-09", variantId: "image", prompt: "Create an ecommerce product photo pack", label: "E-commerce pack" },
  { workflowId: "WF-10", variantId: "photos", prompt: "Make numbered PDF notes from my photos", label: "Student notes PDF" },
].map((entry) => Object.freeze(entry)));

export function normalizeCanonicalPrompt(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
