export const SOCIAL_VIDEO_PRESETS = [
    {
        id: "VERTICAL",
        name: "Vertical 9:16",
        description:
            "Reels, Shorts, Stories and vertical mobile video.",
        width: 720,
        height: 1280,
        aspectRatio: "9:16",
    },

    {
        id: "SQUARE",
        name: "Square 1:1",
        description:
            "Square social posts and general feed video.",
        width: 720,
        height: 720,
        aspectRatio: "1:1",
    },

    {
        id: "LANDSCAPE",
        name: "Landscape 16:9",
        description:
            "YouTube, websites and standard landscape video.",
        width: 1280,
        height: 720,
        aspectRatio: "16:9",
    },
];

export const VIDEO_RESIZE_MODES = [
    {
        id: "FILL",
        name: "Crop to Fill",
        description:
            "Fill the complete frame without stretching. Some edges may be cropped.",
    },

    {
        id: "FIT",
        name: "Fit with Bars",
        description:
            "Keep the whole video visible without stretching or cropping.",
    },
];

export const VIDEO_GRAVITIES = [
    {
        id: "CENTER",
        name: "Center",
    },

    {
        id: "NORTH",
        name: "Top",
    },

    {
        id: "SOUTH",
        name: "Bottom",
    },

    {
        id: "WEST",
        name: "Left",
    },

    {
        id: "EAST",
        name: "Right",
    },
];

export const VIDEO_ROTATIONS = [
    {
        angle: 90,
        label: "90°",
    },

    {
        angle: 180,
        label: "180°",
    },

    {
        angle: 270,
        label: "270°",
    },
];

export function getSocialVideoPreset(
    presetId
) {
    return (
        SOCIAL_VIDEO_PRESETS.find(
            (preset) =>
                preset.id === presetId
        ) ||
        SOCIAL_VIDEO_PRESETS[0]
    );
}