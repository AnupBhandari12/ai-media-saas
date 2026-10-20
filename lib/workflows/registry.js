// Phase 22 / Stage 01: declarative plans only. No file is processed here.
// The existing tool IDs are the only processing capabilities a future executor may use.
export const WORKFLOW_STATUS = Object.freeze({
  PLANNED: "PLANNED",
  AVAILABLE: "AVAILABLE",
});

export const workflows = Object.freeze([
  {
    id: "WF-01", slug: "whatsapp-ready", name: "WhatsApp Ready",
    description: "Prepare an image or video to share with fewer file-size surprises.",
    priority: "P1", status: WORKFLOW_STATUS.PLANNED,
    variants: [
      { id: "image", name: "Image", steps: ["IMG-05", "IMG-02"] },
      { id: "video", name: "Video (cloud/fair-use later)", steps: ["VID-03", "VID-02"] },
    ],
  },
  {
    id: "WF-02", slug: "instagram-ready", name: "Instagram Ready",
    description: "Plan post, story or reel-safe dimensions with preview before export.",
    priority: "P1", status: WORKFLOW_STATUS.PLANNED,
    variants: [
      { id: "image", name: "Photo", steps: ["IMG-08", "IMG-03", "IMG-01"] },
      { id: "video", name: "Reel (cloud/fair-use later)", steps: ["VID-07", "VID-01"] },
    ],
  },
  {
    id: "WF-03", slug: "facebook-ready", name: "Facebook Ready",
    description: "Prepare common post and cover formats without stretching images.",
    priority: "P2", status: WORKFLOW_STATUS.PLANNED,
    variants: [
      { id: "image", name: "Photo", steps: ["IMG-08", "IMG-03", "IMG-01"] },
    ],
  },
  {
    id: "WF-04", slug: "linkedin-ready", name: "LinkedIn Ready",
    description: "Prepare a clean, web-friendly professional image.",
    priority: "P2", status: WORKFLOW_STATUS.PLANNED,
    variants: [
      { id: "post", name: "Post image", steps: ["IMG-03", "IMG-05", "IMG-01"] },
      { id: "profile", name: "Profile image", steps: ["IMG-11", "IMG-01"] },
    ],
  },
  {
    id: "WF-05", slug: "youtube-ready", name: "YouTube Ready",
    description: "Prepare thumbnails and compatible video as separate safe branches.",
    priority: "P2", status: WORKFLOW_STATUS.PLANNED,
    variants: [
      { id: "thumbnail", name: "Thumbnail", steps: ["CRT-04", "IMG-02"] },
      { id: "video", name: "Video (cloud/fair-use later)", steps: ["VID-03", "VID-01"] },
    ],
  },
  {
    id: "WF-06", slug: "website-ready", name: "Website Ready",
    description: "Resize, convert, strip common image metadata and compress for websites.",
    priority: "P1", status: WORKFLOW_STATUS.PLANNED,
    variants: [
      { id: "image", name: "Web image", steps: ["IMG-03", "IMG-05", "IMG-14", "IMG-02"] },
    ],
  },
  {
    id: "WF-07", slug: "email-ready", name: "Email Ready",
    description: "Choose the right compression path for an email attachment.",
    priority: "P1", status: WORKFLOW_STATUS.PLANNED,
    variants: [
      { id: "image", name: "Image attachment", steps: ["IMG-02"] },
      { id: "pdf", name: "PDF attachment", steps: ["PDF-11"] },
    ],
  },
  {
    id: "WF-08", slug: "job-form-ready", name: "Job / Form Ready",
    description: "Follow a form's exact photo or PDF size constraints.",
    priority: "P1", status: WORKFLOW_STATUS.PLANNED,
    variants: [
      { id: "photo", name: "Passport or ID photo", steps: ["IMG-10", "IMG-02"] },
      { id: "pdf", name: "PDF attachment", steps: ["PDF-11"] },
    ],
  },
  {
    id: "WF-09", slug: "ecommerce-product-pack", name: "E-commerce Product Pack",
    description: "Plan product picture dimensions, branding and optional future AI editing.",
    priority: "P3", status: WORKFLOW_STATUS.PLANNED,
    variants: [
      { id: "image", name: "Basic image pack (no paid AI)", steps: ["IMG-08", "IMG-03", "IMG-12"] },
    ],
  },
  {
    id: "WF-10", slug: "student-notes-pack", name: "Student Notes Pack",
    description: "Create study PDFs or extract readable text without unsupported AI promises.",
    priority: "P3", status: WORKFLOW_STATUS.PLANNED,
    variants: [
      { id: "photos", name: "Photos to numbered PDF", steps: ["PDF-17", "PDF-13"] },
      { id: "scan", name: "OCR text from scanned PDF", steps: ["PDF-18"] },
    ],
  },
]);

export function getWorkflowById(id) {
  return workflows.find((workflow) => workflow.id === id);
}

export function getWorkflowBySlug(slug) {
  return workflows.find((workflow) => workflow.slug === slug);
}
