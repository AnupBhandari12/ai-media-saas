export const AUDIO_FORMATS = [
    {
        value: "mp3",
        label: "MP3",
        mime: "audio/mpeg",
    },

    {
        value: "wav",
        label: "WAV",
        mime: "audio/wav",
    },

    {
        value: "m4a",
        label: "M4A",
        mime: "audio/mp4",
    },

    {
        value: "ogg",
        label: "OGG",
        mime: "audio/ogg",
    },
];

export const AUDIO_BITRATES = [
    {
        value: 64,
        label: "64 kbps",
        description:
            "Small file · speech and voice notes",
    },

    {
        value: 96,
        label: "96 kbps",
        description:
            "Balanced small-file preset",
    },

    {
        value: 128,
        label: "128 kbps",
        description:
            "Good general quality",
    },

    {
        value: 192,
        label: "192 kbps",
        description:
            "Higher quality · larger file",
    },
];

export function getAudioMime(
    format
) {
    return (
        AUDIO_FORMATS.find(
            (item) =>
                item.value === format
        )?.mime ||
        "application/octet-stream"
    );
}

export function getAudioCodecArgs(
    format,
    bitrate = 192
) {
    if (format === "mp3") {
        return [
            "-c:a",
            "libmp3lame",

            "-b:a",
            `${bitrate}k`,
        ];
    }

    if (format === "wav") {
        return [
            "-c:a",
            "pcm_s16le",
        ];
    }

    if (format === "m4a") {
        return [
            "-c:a",
            "aac",

            "-b:a",
            `${bitrate}k`,
        ];
    }

    if (format === "ogg") {
        return [
            "-c:a",
            "libvorbis",

            "-q:a",
            "5",
        ];
    }

    throw new Error(
        "Unsupported audio format."
    );
}

export function buildAudioCommand({
    operation,

    inputName,

    outputName,

    format,

    bitrate = 192,

    start = 0,

    end = null,
}) {
    const codecArgs =
        getAudioCodecArgs(
            format,
            bitrate
        );

    if (
        operation ===
        "TRIM"
    ) {
        const duration =
            Number(end) -
            Number(start);

        if (
            !Number.isFinite(
                duration
            ) ||
            duration <= 0
        ) {
            throw new Error(
                "Invalid trim duration."
            );
        }

        return [
            "-y",

            "-ss",
            String(start),

            "-i",
            inputName,

            "-t",
            String(duration),

            "-vn",

            ...codecArgs,

            outputName,
        ];
    }

    return [
        "-y",

        "-i",
        inputName,

        "-vn",

        ...codecArgs,

        outputName,
    ];
}

export function createAudioFilename(
    originalName,
    suffix,
    format
) {
    const name =
        String(
            originalName ||
            "audio"
        )
            .replace(
                /\.[^.]+$/,
                ""
            )
            .replace(
                /[^a-zA-Z0-9-_]+/g,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            ) ||
        "audio";

    return `${name}-${suffix}.${format}`;
}