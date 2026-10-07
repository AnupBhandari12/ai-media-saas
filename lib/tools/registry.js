export const TOOL_STATUS = {
  AVAILABLE: "AVAILABLE",
  COMING_SOON: "COMING_SOON",
};

export const TOOL_ENGINES = {
  BROWSER_IMAGE: "BROWSER_IMAGE",
  HYBRID_IMAGE: "HYBRID_IMAGE",

  BROWSER_PDF: "BROWSER_PDF",
  PDF_RENDER: "PDF_RENDER",
  HYBRID_PDF: "HYBRID_PDF",
  PDF_OCR: "PDF_OCR",

  BRAND_KIT: "BRAND_KIT",

  CLOUDINARY_VIDEO:
    "CLOUDINARY_VIDEO",

  HYBRID_VIDEO:
    "HYBRID_VIDEO",

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
  {
    id: "PDF-01",
    slug: "photos-to-one-pdf",
    name: "Photos to One PDF",
    description:
      "Combine multiple photos into one ordered PDF.",
    category: "PDF",
    route: "/tools/pdf/photos-to-pdf",
    engine: TOOL_ENGINES.BROWSER_PDF,
    inputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    outputTypes: [
      "application/pdf",
    ],
    quotaKey: "LOCAL_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "PDF-02",
    slug: "pdf-to-jpg",
    name: "PDF to JPG",
    description:
      "Convert selected or all PDF pages into JPG images.",
    category: "PDF",
    route: "/tools/pdf/to-jpg",
    engine: TOOL_ENGINES.PDF_RENDER,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "image/jpeg",
      "application/zip",
    ],
    quotaKey: "LOCAL_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "PDF-03",
    slug: "pdf-to-png",
    name: "PDF to PNG",
    description:
      "Render PDF pages as high-quality PNG images.",
    category: "PDF",
    route: "/tools/pdf/to-png",
    engine: TOOL_ENGINES.PDF_RENDER,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "image/png",
      "application/zip",
    ],
    quotaKey: "LOCAL_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "PDF-04",
    slug: "merge-pdfs",
    name: "Merge PDFs",
    description:
      "Combine multiple PDF files in your chosen order.",
    category: "PDF",
    route: "/tools/pdf/merge",
    engine: TOOL_ENGINES.BROWSER_PDF,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "application/pdf",
    ],
    quotaKey: "LOCAL_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "PDF-05",
    slug: "split-pdf",
    name: "Split PDF by Ranges",
    description:
      "Split a PDF using ranges such as 1-3, 4-8.",
    category: "PDF",
    route: "/tools/pdf/split",
    engine: TOOL_ENGINES.BROWSER_PDF,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "application/pdf",
      "application/zip",
    ],
    quotaKey: "LOCAL_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "PDF-06",
    slug: "extract-pdf-pages",
    name: "Extract PDF Pages",
    description:
      "Keep selected pages or ranges in a new PDF.",
    category: "PDF",
    route: "/tools/pdf/extract-pages",
    engine: TOOL_ENGINES.BROWSER_PDF,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "application/pdf",
    ],
    quotaKey: "LOCAL_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "PDF-07",
    slug: "delete-pdf-pages",
    name: "Delete PDF Pages",
    description:
      "Remove unwanted pages from a PDF.",
    category: "PDF",
    route: "/tools/pdf/delete-pages",
    engine: TOOL_ENGINES.BROWSER_PDF,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "application/pdf",
    ],
    quotaKey: "LOCAL_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "PDF-08",
    slug: "reorder-pdf-pages",
    name: "Reorder PDF Pages",
    description:
      "Arrange PDF pages into a new order.",
    category: "PDF",
    route: "/tools/pdf/reorder-pages",
    engine: TOOL_ENGINES.BROWSER_PDF,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "application/pdf",
    ],
    quotaKey: "LOCAL_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "PDF-09",
    slug: "rotate-pdf-pages",
    name: "Rotate PDF Pages",
    description:
      "Rotate selected or all PDF pages in 90-degree steps.",
    category: "PDF",
    route: "/tools/pdf/rotate-pages",
    engine: TOOL_ENGINES.BROWSER_PDF,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "application/pdf",
    ],
    quotaKey: "LOCAL_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "PDF-10",
    slug: "crop-pdf-pages",
    name: "Crop PDF Pages",
    description:
      "Trim PDF page margins or visible page area.",
    category: "PDF",
    route: "/tools/pdf/crop-pages",
    engine: TOOL_ENGINES.BROWSER_PDF,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "application/pdf",
    ],
    quotaKey: "LOCAL_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },

  {
    id: "PDF-11",
    slug: "compress-pdf",
    name: "Basic PDF Compression",
    description:
      "Optimize image-heavy or scanned PDFs for screen use.",
    category: "PDF",
    route: "/tools/pdf/compress",
    engine: TOOL_ENGINES.HYBRID_PDF,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "application/pdf",
    ],
    quotaKey: "LOCAL_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "PDF-12",
    slug: "compress-pdf-target-size",
    name: "Compress PDF to Target Size",
    description:
      "Try to reach a requested PDF file size using worker processing.",
    category: "PDF",
    route: "/tools/pdf/compress-target",
    engine: TOOL_ENGINES.WORKER,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "application/pdf",
    ],
    quotaKey: "WORKER_PDF_TOOL",
    status: TOOL_STATUS.COMING_SOON,
    priority: "P2",
  },

  {
    id: "PDF-13",
    slug: "add-pdf-page-numbers",
    name: "Add Page Numbers",
    description:
      "Add configurable page numbers to selected PDF pages.",
    category: "PDF",
    route: "/tools/pdf/page-numbers",
    engine: TOOL_ENGINES.BROWSER_PDF,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "application/pdf",
    ],
    quotaKey: "LOCAL_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "PDF-14",
    slug: "add-pdf-watermark",
    name: "Add PDF Watermark",
    description:
      "Add text or logo watermarks to selected PDF pages.",
    category: "PDF",
    route: "/tools/pdf/watermark",
    engine: TOOL_ENGINES.BROWSER_PDF,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "application/pdf",
    ],
    quotaKey: "LOCAL_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "PDF-15",
    slug: "protect-pdf",
    name: "Protect PDF with Password",
    description:
      "Encrypt a PDF using dedicated worker processing.",
    category: "PDF",
    route: "/tools/pdf/protect",
    engine: TOOL_ENGINES.WORKER,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "application/pdf",
    ],
    quotaKey: "WORKER_PDF_TOOL",
    status: TOOL_STATUS.COMING_SOON,
    priority: "P2",
  },

  {
    id: "PDF-16",
    slug: "unlock-pdf",
    name: "Unlock PDF with Known Password",
    description:
      "Create an unlocked copy when you know the PDF password.",
    category: "PDF",
    route: "/tools/pdf/unlock",
    engine: TOOL_ENGINES.WORKER,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "application/pdf",
    ],
    quotaKey: "WORKER_PDF_TOOL",
    status: TOOL_STATUS.COMING_SOON,
    priority: "P2",
  },

  {
    id: "PDF-17",
    slug: "scan-photos-to-pdf",
    name: "Scan Photos to PDF",
    description:
      "Turn phone document photos into a clean ordered PDF.",
    category: "PDF",
    route: "/tools/pdf/scan-to-pdf",
    engine: TOOL_ENGINES.BROWSER_PDF,
    inputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    outputTypes: [
      "application/pdf",
    ],
    quotaKey: "LOCAL_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "PDF-18",
    slug: "pdf-ocr-to-text",
    name: "PDF OCR to Text",
    description:
      "Render scanned PDF pages and extract text using OCR.",
    category: "PDF",
    route: "/tools/pdf/ocr",
    engine: TOOL_ENGINES.PDF_OCR,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "text/plain",
    ],
    quotaKey: "OCR_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },

  {
    id: "PDF-19",
    slug: "pdf-text-extractor",
    name: "PDF Text Extractor",
    description:
      "Extract selectable text from PDF pages without unnecessary OCR.",
    category: "PDF",
    route: "/tools/pdf/text-extractor",
    engine: TOOL_ENGINES.PDF_RENDER,
    inputTypes: [
      "application/pdf",
    ],
    outputTypes: [
      "text/plain",
    ],
    quotaKey: "LOCAL_PDF_TOOL",
    status: TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },

  {
    id: "CRT-01",
    slug: "smart-social-media-pack",
    name: "Smart Social Media Pack",
    description:
      "Create multiple social, YouTube, and website image sizes from one upload.",
    category: "CREATOR",
    route:
      "/tools/creator/social-pack",
    engine:
      TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    outputTypes: [
      "image/jpeg",
      "application/zip",
    ],
    quotaKey:
      "LOCAL_CREATOR_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "CRT-02",
    slug: "download-all-as-zip",
    name: "Download All as ZIP",
    description:
      "Package multiple outputs or local files into one ZIP archive.",
    category: "CREATOR",
    route:
      "/tools/creator/download-all-zip",
    engine:
      TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: [
      "application/octet-stream",
    ],
    outputTypes: [
      "application/zip",
    ],
    quotaKey:
      "LOCAL_CREATOR_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "CRT-03",
    slug: "brand-kit",
    name: "Brand Kit",
    description:
      "Save reusable logo, brand colors, and default watermark settings.",
    category: "CREATOR",
    route:
      "/tools/creator/brand-kit",
    engine:
      TOOL_ENGINES.BRAND_KIT,
    inputTypes: [
      "application/json",
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    outputTypes: [
      "application/json",
    ],
    quotaKey:
      "BRAND_KIT",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },

  {
    id: "CRT-04",
    slug:
      "youtube-thumbnail-maker",
    name:
      "YouTube Thumbnail Maker",
    description:
      "Create 1280×720 YouTube thumbnails with text, safe zones, crop focus, and optional Brand Kit styling.",
    category: "CREATOR",
    route:
      "/tools/creator/youtube-thumbnail",
    engine:
      TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    outputTypes: [
      "image/jpeg",
      "image/png",
    ],
    quotaKey:
      "LOCAL_CREATOR_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },
  {
    id: "CRT-05",
    slug:
      "screenshot-beautifier",
    name:
      "Screenshot Beautifier",
    description:
      "Frame screenshots with polished backgrounds, padding, browser-style chrome, and high-resolution export.",
    category: "CREATOR",
    route:
      "/tools/creator/screenshot-beautifier",
    engine:
      TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    outputTypes: [
      "image/png",
      "image/jpeg",
    ],
    quotaKey:
      "LOCAL_CREATOR_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },
  {
    id: "CRT-06",
    slug:
      "meme-maker",
    name:
      "Meme Maker",
    description:
      "Create memes with top, bottom, or custom outlined text.",
    category: "CREATOR",
    route:
      "/tools/creator/meme-maker",
    engine:
      TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    outputTypes: [
      "image/png",
      "image/jpeg",
    ],
    quotaKey:
      "LOCAL_CREATOR_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P3",
  },

  {
    id: "CRT-07",
    slug:
      "simple-poster-banner",
    name:
      "Simple Poster / Banner",
    description:
      "Create focused social and business graphics from editable templates.",
    category: "CREATOR",
    route:
      "/tools/creator/poster-banner",
    engine:
      TOOL_ENGINES.BROWSER_IMAGE,
    inputTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    outputTypes: [
      "image/png",
      "image/jpeg",
    ],
    quotaKey:
      "LOCAL_CREATOR_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P3",
  },

  {
    id: "CRT-08",
    slug:
      "bulk-watermark",
    name:
      "Bulk Watermark",
    description:
      "Apply text or logo watermarks to multiple images and download the results as a ZIP.",
    category: "CREATOR",
    route:
      "/tools/creator/bulk-watermark",
    engine:
      TOOL_ENGINES.BROWSER_IMAGE,
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
    quotaKey:
      "LOCAL_CREATOR_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },

  {
    id: "VID-01",
    slug: "compress-video",
    name: "Compress Video",
    description:
      "Reduce video file size with measured Cloudinary compression presets.",
    category: "VIDEO",
    route:
      "/tools/video/compress",
    engine:
      TOOL_ENGINES.CLOUDINARY_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "video/mp4",
    ],
    quotaKey:
      "CLOUD_VIDEO_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "VID-02",
    slug:
      "compress-video-target-size",
    name:
      "Compress Video to Target MB",
    description:
      "Compress a video toward a requested maximum file size.",
    category: "VIDEO",
    route:
      "/tools/video/compress-target",
    engine:
      TOOL_ENGINES.HYBRID_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "video/mp4",
    ],
    quotaKey:
      "CLOUD_VIDEO_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },

  {
    id: "VID-03",
    slug:
      "convert-video-format",
    name:
      "Convert Video Format",
    description:
      "Convert videos to MP4, WebM, or MOV where supported.",
    category: "VIDEO",
    route:
      "/tools/video/convert",
    engine:
      TOOL_ENGINES.CLOUDINARY_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ],
    quotaKey:
      "CLOUD_VIDEO_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "VID-04",
    slug: "trim-video",
    name: "Trim Video",
    description:
      "Create a video from an exact start and end time.",
    category: "VIDEO",
    route:
      "/tools/video/trim",
    engine:
      TOOL_ENGINES.CLOUDINARY_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "video/mp4",
    ],
    quotaKey:
      "CLOUD_VIDEO_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "VID-05",
    slug: "cut-video-segment",
    name: "Cut Video Segment",
    description:
      "Remove or keep a selected video segment.",
    category: "VIDEO",
    route:
      "/tools/video/cut-segment",
    engine:
      TOOL_ENGINES.HYBRID_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "video/mp4",
    ],
    quotaKey:
      "CLOUD_VIDEO_TOOL",
    status:
      TOOL_STATUS.COMING_SOON,
    priority: "P2",
  },

  {
    id: "VID-06",
    slug: "merge-videos",
    name: "Merge Videos",
    description:
      "Combine video clips in the selected order.",
    category: "VIDEO",
    route:
      "/tools/video/merge",
    engine:
      TOOL_ENGINES.HYBRID_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "video/mp4",
    ],
    quotaKey:
      "CLOUD_VIDEO_TOOL",
    status:
      TOOL_STATUS.COMING_SOON,
    priority: "P3",
  },

  {
    id: "VID-07",
    slug:
      "resize-social-video",
    name:
      "Resize / Social Video",
    description:
      "Create safe 9:16, 1:1, and 16:9 video outputs.",
    category: "VIDEO",
    route:
      "/tools/video/resize-social",
    engine:
      TOOL_ENGINES.CLOUDINARY_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "video/mp4",
    ],
    quotaKey:
      "CLOUD_VIDEO_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "VID-08",
    slug: "crop-video",
    name: "Crop Video",
    description:
      "Crop a video to a selected region or aspect ratio.",
    category: "VIDEO",
    route:
      "/tools/video/crop",
    engine:
      TOOL_ENGINES.HYBRID_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "video/mp4",
    ],
    quotaKey:
      "CLOUD_VIDEO_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },

  {
    id: "VID-09",
    slug: "rotate-video",
    name: "Rotate Video",
    description:
      "Rotate video by 90, 180, or 270 degrees.",
    category: "VIDEO",
    route:
      "/tools/video/rotate",
    engine:
      TOOL_ENGINES.HYBRID_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "video/mp4",
    ],
    quotaKey:
      "CLOUD_VIDEO_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },

  {
    id: "VID-10",
    slug: "mute-video",
    name:
      "Mute / Remove Audio",
    description:
      "Create a silent copy of a video.",
    category: "VIDEO",
    route:
      "/tools/video/mute",
    engine:
      TOOL_ENGINES.CLOUDINARY_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "video/mp4",
    ],
    quotaKey:
      "CLOUD_VIDEO_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "VID-11",
    slug:
      "extract-video-audio",
    name: "Extract Audio",
    description:
      "Extract a video's audio as MP3, M4A, or WAV.",
    category: "VIDEO",
    route:
      "/tools/video/extract-audio",
    engine:
      TOOL_ENGINES.HYBRID_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "audio/mpeg",
      "audio/mp4",
      "audio/wav",
    ],
    quotaKey:
      "CLOUD_VIDEO_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "VID-12",
    slug:
      "video-frame-extractor",
    name:
      "Thumbnail / Frame Extractor",
    description:
      "Download a video frame from a selected timestamp.",
    category: "VIDEO",
    route:
      "/tools/video/frame-extractor",
    engine:
      TOOL_ENGINES.CLOUDINARY_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "image/jpeg",
      "image/png",
    ],
    quotaKey:
      "CLOUD_VIDEO_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P1",
  },

  {
    id: "VID-13",
    slug: "video-to-gif",
    name: "Video to GIF",
    description:
      "Turn a short video clip into a looping GIF.",
    category: "VIDEO",
    route:
      "/tools/video/gif",
    engine:
      TOOL_ENGINES.HYBRID_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "image/gif",
    ],
    quotaKey:
      "CLOUD_VIDEO_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },

  {
    id: "VID-14",
    slug:
      "video-watermark",
    name:
      "Video Watermark",
    description:
      "Overlay text or a Brand Kit logo onto video.",
    category: "VIDEO",
    route:
      "/tools/video/watermark",
    engine:
      TOOL_ENGINES.CLOUDINARY_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "video/mp4",
    ],
    quotaKey:
      "CLOUD_VIDEO_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P2",
  },

  {
    id: "VID-15",
    slug:
      "video-auto-subtitles",
    name: "Auto Subtitles",
    description:
      "Generate, review, and export timed video captions.",
    category: "VIDEO",
    route:
      "/tools/video/subtitles",
    engine:
      TOOL_ENGINES.HYBRID_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "text/vtt",
      "application/x-subrip",
      "video/mp4",
    ],
    quotaKey:
      "AI_VIDEO_TOOL",
    status:
      TOOL_STATUS.COMING_SOON,
    priority: "P3",
  },

  {
    id: "VID-16",
    slug:
      "short-smart-preview",
    name:
      "Short Smart Preview",
    description:
      "Create a compact preview clip without blocking original playback.",
    category: "VIDEO",
    route:
      "/tools/video/preview",
    engine:
      TOOL_ENGINES.CLOUDINARY_VIDEO,
    inputTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ],
    outputTypes: [
      "video/mp4",
    ],
    quotaKey:
      "CLOUD_VIDEO_TOOL",
    status:
      TOOL_STATUS.AVAILABLE,
    priority: "P2",
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