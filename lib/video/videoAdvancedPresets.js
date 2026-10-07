export const VIDEO_WATERMARK_POSITIONS = [
  {
    value: "TOP_LEFT",
    label: "Top Left",
  },

  {
    value: "TOP_CENTER",
    label: "Top Center",
  },

  {
    value: "TOP_RIGHT",
    label: "Top Right",
  },

  {
    value: "CENTER",
    label: "Center",
  },

  {
    value: "BOTTOM_LEFT",
    label: "Bottom Left",
  },

  {
    value: "BOTTOM_CENTER",
    label: "Bottom Center",
  },

  {
    value: "BOTTOM_RIGHT",
    label: "Bottom Right",
  },
];

export function brandPositionToVideo(
  position
) {
  const valid =
    VIDEO_WATERMARK_POSITIONS.some(
      (item) =>
        item.value === position
    );

  return valid
    ? position
    : "BOTTOM_RIGHT";
}