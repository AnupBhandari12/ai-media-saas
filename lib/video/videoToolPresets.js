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

export const TARGET_VIDEO_SIZE_PRESETS = [
    {
        value: 5,
        label: "5 MB",
        description:
            "Useful for smaller message or upload limits.",
    },

    {
        value: 10,
        label: "10 MB",
        description:
            "Practical general sharing target.",
    },

    {
        value: 25,
        label: "25 MB",
        description:
            "Keep more quality for larger uploads.",
    },
];

export const AUDIO_FORMATS = [
    {
        value: "mp3",
        label: "MP3",
        description:
            "Broad compatibility and practical file size.",
    },

    {
        value: "m4a",
        label: "M4A",
        description:
            "AAC-based format for phones and modern apps.",
    },

    {
        value: "wav",
        label: "WAV",
        description:
            "Larger file for editing and uncompressed-style workflows.",
    },
];

export const AUDIO_QUALITY_PRESETS = [
    {
        id: "SMALL",
        label: "Smaller",
        bitrate: 96000,
    },

    {
        id: "BALANCED",
        label: "Balanced",
        bitrate: 128000,
    },

    {
        id: "HIGH",
        label: "High",
        bitrate: 192000,
    },
];

export const GIF_WIDTH_PRESETS = [
    {
        value: 320,
        label: "320 px",
    },

    {
        value: 480,
        label: "480 px",
    },

    {
        value: 640,
        label: "640 px",
    },
];

export const GIF_FPS_PRESETS = [
    {
        value: 6,
        label: "6 FPS",
    },

    {
        value: 10,
        label: "10 FPS",
    },

    {
        value: 15,
        label: "15 FPS",
    },
];

export const SMART_PREVIEW_DURATIONS = [
    {
        value: 5,
        label: "5 sec",
    },

    {
        value: 8,
        label: "8 sec",
    },

    {
        value: 12,
        label: "12 sec",
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