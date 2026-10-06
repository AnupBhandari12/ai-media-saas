export function normalizePdfTextItems(
  items = []
) {
  let text = "";

  for (const item of items) {
    const value =
      typeof item?.str ===
      "string"
        ? item.str
        : "";

    if (!value) {
      continue;
    }

    text += value;

    if (item.hasEOL) {
      text += "\n";
    } else {
      text += " ";
    }
  }

  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function combinePdfPageTexts(
  pages = []
) {
  return pages
    .map(
      ({
        pageNumber,
        text,
      }) => {
        return [
          `--- Page ${pageNumber} ---`,
          String(
            text || ""
          ).trim(),
        ].join("\n");
      }
    )
    .join("\n\n")
    .trim();
}

export function countWords(
  text
) {
  const normalized =
    String(text || "").trim();

  if (!normalized) {
    return 0;
  }

  return normalized
    .split(/\s+/)
    .filter(Boolean).length;
}