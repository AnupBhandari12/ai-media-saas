export const BRAND_WATERMARK_TYPES = {
  TEXT: "TEXT",
  LOGO: "LOGO",
};

export const BRAND_WATERMARK_POSITIONS = [
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

export const DEFAULT_BRAND_KIT = {
  brandName: "",
  primaryColor: "#4f46e5",
  secondaryColor: "#0891b2",

  defaultWatermarkType: "TEXT",
  defaultWatermarkText: "",

  defaultWatermarkOpacity: 25,
  defaultWatermarkSize: 20,
  defaultWatermarkPosition:
    "BOTTOM_RIGHT",
};