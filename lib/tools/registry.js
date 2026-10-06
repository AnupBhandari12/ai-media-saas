export const TOOL_STATUS = {
  AVAILABLE: "AVAILABLE",
  COMING_SOON: "COMING_SOON",
};

export const TOOL_ENGINES = {
  BROWSER_IMAGE: "BROWSER_IMAGE",
  HYBRID_IMAGE: "HYBRID_IMAGE",
  WORKER: "WORKER",
};

export const tools = [
  {
    id: "IMG-01",
    slug: "compress-image",
    name: "Compress Image",
    description: "Reduce image file size for email, forms, and websites.",
    category: "IMAGE",
    route: "/tools/image/compress",
    engine: TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: ["image/jpeg", "image/png", "image/webp"],
    outputTypes: ["image/jpeg", "image/png", "image/webp"],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "IMG-02",
    slug: "compress-to-target-size",
    name: "Compress to Target Size",
    description: "Compress an image to 100KB, 200KB, 500KB, 1MB, or custom size.",
    category: "IMAGE",
    route: "/tools/image/compress-target",
    engine: TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: ["image/jpeg", "image/png", "image/webp"],
    outputTypes: ["image/jpeg", "image/webp"],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "IMG-03",
    slug: "resize-by-pixels",
    name: "Resize by Pixels",
    description: "Resize an image to exact width and height while preserving aspect ratio.",
    category: "IMAGE",
    route: "/tools/image/resize-pixels",
    engine: TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: ["image/jpeg", "image/png", "image/webp"],
    outputTypes: ["image/jpeg", "image/png", "image/webp"],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "IMG-04",
    slug: "resize-by-percentage",
    name: "Resize by Percentage",
    description: "Scale an image by 25%, 50%, 75%, or a custom percentage.",
    category: "IMAGE",
    route: "/tools/image/resize-percentage",
    engine: TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: ["image/jpeg", "image/png", "image/webp"],
    outputTypes: ["image/jpeg", "image/png", "image/webp"],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "IMG-05",
    slug: "convert-image-format",
    name: "Convert Image Format",
    description: "Convert between JPG, PNG, WebP, and supported modern formats.",
    category: "IMAGE",
    route: "/tools/image/convert",
    engine: TOOL_ENGINES.HYBRID_IMAGE,
    inputTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    outputTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "IMG-06",
    slug: "heic-to-jpg",
    name: "HEIC / HEIF to JPG",
    description: "Convert iPhone HEIC or HEIF photos into broadly compatible images.",
    category: "IMAGE",
    route: "/tools/image/heic-converter",
    engine: TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: ["image/heic", "image/heif"],
    outputTypes: ["image/jpeg", "image/png"],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },

  {
    id: "IMG-07",
    slug: "tiff-to-image",
    name: "TIFF to PNG / JPG",
    description: "Convert TIFF scans and legacy images into common web formats.",
    category: "IMAGE",
    route: "/tools/image/tiff-converter",
    engine: TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: ["image/tiff"],
    outputTypes: ["image/jpeg", "image/png"],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P3",
  },

  {
    id: "IMG-08",
    slug: "crop-image",
    name: "Crop Image",
    description: "Crop images freely or use common aspect ratios.",
    category: "IMAGE",
    route: "/tools/image/crop",
    engine: TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: ["image/jpeg", "image/png", "image/webp"],
    outputTypes: ["image/jpeg", "image/png", "image/webp"],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "IMG-09",
    slug: "rotate-flip-image",
    name: "Rotate / Flip Image",
    description: "Rotate or flip an image without needing an editor.",
    category: "IMAGE",
    route: "/tools/image/rotate-flip",
    engine: TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: ["image/jpeg", "image/png", "image/webp"],
    outputTypes: ["image/jpeg", "image/png", "image/webp"],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "IMG-10",
    slug: "passport-id-photo",
    name: "Passport / ID Photo Maker",
    description: "Prepare photos for job, college, visa, and form requirements.",
    category: "IMAGE",
    route: "/tools/image/passport-photo",
    engine: TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: ["image/jpeg", "image/png", "image/webp"],
    outputTypes: ["image/jpeg", "image/png"],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },
  {
    id: "IMG-11",
    slug: "profile-picture-maker",
    name: "Profile Picture Maker",
    description:
      "Create clean square profile pictures for social media and professional accounts.",
    category: "IMAGE",
    route: "/tools/image/profile-picture",
    engine: TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    outputTypes: [
      "image/jpeg",
      "image/png",
    ],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },

  {
    id: "IMG-12",
    slug: "watermark-image",
    name: "Watermark Image",
    description:
      "Add text or logo watermarks with custom position, opacity, and size.",
    category: "IMAGE",
    route: "/tools/image/watermark",
    engine: TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    outputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },
  {
    id: "IMG-13",
    slug: "view-image-metadata",
    name: "View Image Metadata",
    description:
      "Inspect image dimensions, file details, EXIF, and available GPS metadata.",
    category: "IMAGE",
    route: "/tools/image/metadata",
    engine: TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    outputTypes: [
      "application/json",
    ],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },

  {
    id: "IMG-14",
    slug: "remove-image-metadata",
    name: "Remove EXIF / GPS Metadata",
    description:
      "Create a privacy-clean image without common embedded EXIF or GPS metadata.",
    category: "IMAGE",
    route: "/tools/image/remove-metadata",
    engine: TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    outputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },
  {
    id: "IMG-15",
    slug: "blur-redact-region",
    name: "Blur / Redact Region",
    description:
      "Hide sensitive regions by blurring or permanently covering selected areas.",
    category: "IMAGE",
    route: "/tools/image/blur-redact",
    engine: TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    outputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },

  {
    id: "IMG-16",
    slug: "batch-image-processor",
    name: "Batch Image Processor",
    description:
      "Resize and convert multiple images with bounded local processing and ZIP download.",
    category: "IMAGE",
    route: "/tools/image/batch",
    engine: TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    outputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/zip",
    ],
    quotaKey: "LOCAL_IMAGE_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },
];

export function getToolById(toolId) {
  return tools.find((tool) => tool.id === toolId);
}

export function getToolBySlug(slug) {
  return tools.find((tool) => tool.slug === slug);
}

export function getToolsByCategory(category) {
  return tools.filter((tool) => tool.category === category);
}