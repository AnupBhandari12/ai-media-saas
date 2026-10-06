import JSZip from "jszip";

const DEFAULT_MAX_SIZE =
  100 * 1024 * 1024;

export function sanitizeFilename(
  filename
) {
  const safe =
    String(filename || "file")
      .trim()
      .replace(
        /[<>:"/\\|?*\u0000-\u001F]/g,
        "-"
      )
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(
        /^[-.]+|[-.]+$/g,
        ""
      );

  return safe || "file";
}

export async function createResultZip(
  files,
  {
    maxTotalBytes =
      DEFAULT_MAX_SIZE,
  } = {}
) {
  if (
    !Array.isArray(files) ||
    files.length === 0
  ) {
    throw new Error(
      "There are no successful files to package."
    );
  }

  const totalSize =
    files.reduce(
      (sum, item) =>
        sum +
        (item.blob?.size || 0),
      0
    );

  if (
    totalSize >
    maxTotalBytes
  ) {
    throw new Error(
      "The result pack is too large for safe browser ZIP generation."
    );
  }

  const zip =
    new JSZip();

  const usedNames =
    new Set();

  for (const item of files) {
    if (!item.blob) {
      continue;
    }

    let filename =
      sanitizeFilename(
        item.filename
      );

    let counter = 2;

    const dot =
      filename.lastIndexOf(
        "."
      );

    const base =
      dot > 0
        ? filename.slice(
            0,
            dot
          )
        : filename;

    const extension =
      dot > 0
        ? filename.slice(dot)
        : "";

    while (
      usedNames.has(
        filename.toLowerCase()
      )
    ) {
      filename =
        `${base}-${counter}${extension}`;

      counter += 1;
    }

    usedNames.add(
      filename.toLowerCase()
    );

    zip.file(
      filename,
      item.blob
    );
  }

  const zipBlob =
    await zip.generateAsync({
      type: "blob",

      compression:
        "DEFLATE",

      compressionOptions: {
        level: 6,
      },
    });

  return {
    zipBlob,
    fileCount:
      files.length,
    totalSourceSize:
      totalSize,
  };
}