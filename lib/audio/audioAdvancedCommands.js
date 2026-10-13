
export const NOISE_PRESETS = [
    {
        id: "GENTLE",
        name: "Gentle",
        description: "Light cleanup, best starting point for speech.",
    },
    {
        id: "STANDARD",
        name: "Standard",
        description: "More reduction for steady background hiss.",
    },
];

export function buildAdvancedAudioCommand({
    operation,
    inputNames,
    outputName,
    strength = "GENTLE",
}) {
    if (
        !Array.isArray(inputNames) ||
        inputNames.length === 0 ||
        inputNames.some((name) => !name)
    ) {
        throw new Error("Audio input is required.");
    }

    const inputs = inputNames.flatMap((name) => [
        "-i",
        name,
    ]);

    const outputCodec = [
        "-c:a",
        "libmp3lame",
        "-b:a",
        "160k",
        "-ar",
        "44100",
        "-ac",
        "2",
    ];

    if (operation === "MERGE") {
        if (inputNames.length < 2 || inputNames.length > 4) {
            throw new Error("Select 2 to 4 audio clips.");
        }

        const normalizeInputs = inputNames.map(
            (_, index) =>
                `[${index}:a:0]aresample=44100,` +
                `aformat=sample_fmts=fltp:channel_layouts=stereo,` +
                `asetpts=PTS-STARTPTS[a${index}]`,
        );

        const labels = inputNames
            .map((_, index) => `[a${index}]`)
            .join("");

        const filter = [
            ...normalizeInputs,
            `${labels}concat=n=${inputNames.length}:v=0:a=1[outa]`,
        ].join(";");

        return [
            "-y",
            ...inputs,
            "-filter_complex",
            filter,
            "-map",
            "[outa]",
            ...outputCodec,
            outputName,
        ];
    }

    if (inputNames.length !== 1) {
        throw new Error("This operation accepts one audio file.");
    }

    if (operation === "NORMALIZE") {
        return [
            "-y",
            ...inputs,
            "-vn",
            "-af",
            "loudnorm=I=-16:TP=-2:LRA=11",
            ...outputCodec,
            outputName,
        ];
    }

    if (operation === "DENOISE") {
        if (!["GENTLE", "STANDARD"].includes(strength)) {
            throw new Error("Invalid noise cleanup preset.");
        }

        const reduction = strength === "GENTLE" ? 6 : 10;

        return [
            "-y",
            ...inputs,
            "-vn",
            "-af",
            `highpass=f=80,afftdn=nr=${reduction}:nf=-50,lowpass=f=8500`,
            ...outputCodec,
            outputName,
        ];
    }

    throw new Error("Unsupported audio operation.");
}
