import {
    buildAudioCommand,
    createAudioFilename,
    getAudioMime,
} from "@/lib/audio/audioCommands";

let ffmpegInstance = null;
let loadPromise = null;

async function getFFmpeg() {
    if (
        ffmpegInstance &&
        loadPromise
    ) {
        await loadPromise;

        return ffmpegInstance;
    }

    const {
        FFmpeg,
    } =
        await import(
            "@ffmpeg/ffmpeg"
        );

    ffmpegInstance =
        new FFmpeg();

    loadPromise =
        ffmpegInstance.load({
            coreURL:
                "/ffmpeg/ffmpeg-core.js",

            wasmURL:
                "/ffmpeg/ffmpeg-core.wasm",
        });

    await loadPromise;

    return ffmpegInstance;
}

function getInputExtension(
    file
) {
    const extension =
        file.name
            .split(".")
            .pop()
            ?.toLowerCase();

    if (
        [
            "mp3",
            "wav",
            "m4a",
            "ogg",
            "aac",
        ].includes(
            extension
        )
    ) {
        return extension;
    }

    return "audio";
}

export async function getAudioDuration(
    source
) {
    const url =
        source instanceof Blob
            ? URL.createObjectURL(
                source
            )
            : source;

    try {
        return await new Promise(
            (
                resolve,
                reject
            ) => {
                const audio =
                    document.createElement(
                        "audio"
                    );

                audio.preload =
                    "metadata";

                audio.onloadedmetadata =
                    () => {
                        const duration =
                            Number(
                                audio.duration
                            );

                        if (
                            Number.isFinite(
                                duration
                            ) &&
                            duration > 0
                        ) {
                            resolve(
                                duration
                            );
                        } else {
                            reject(
                                new Error(
                                    "Audio duration is unavailable."
                                )
                            );
                        }
                    };

                audio.onerror =
                    () =>
                        reject(
                            new Error(
                                "This audio file could not be read."
                            )
                        );

                audio.src = url;
            }
        );
    } finally {
        if (
            source instanceof Blob
        ) {
            URL.revokeObjectURL(
                url
            );
        }
    }
}

export async function processAudio({
    file,

    operation,

    format,

    bitrate,

    start,

    end,

    onProgress,
}) {
    const ffmpeg =
        await getFFmpeg();

    const {
        fetchFile,
    } =
        await import(
            "@ffmpeg/util"
        );

    const unique =
        `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;

    const inputName =
        `input-${unique}.${getInputExtension(
            file
        )}`;

    const outputName =
        `output-${unique}.${format}`;

    const progressHandler =
        ({
            progress,
        }) => {
            onProgress?.(
                Math.round(
                    Math.max(
                        0,
                        Math.min(
                            1,
                            progress || 0
                        )
                    ) * 100
                )
            );
        };

    ffmpeg.on(
        "progress",
        progressHandler
    );

    try {
        await ffmpeg.writeFile(
            inputName,
            await fetchFile(
                file
            )
        );

        const command =
            buildAudioCommand({
                operation,

                inputName,

                outputName,

                format,

                bitrate,

                start,

                end,
            });

        const exitCode =
            await ffmpeg.exec(
                command
            );

        if (
            exitCode !== 0
        ) {
            throw new Error(
                "FFmpeg could not process this audio file."
            );
        }

        const data =
            await ffmpeg.readFile(
                outputName
            );

        const blob =
            new Blob(
                [data],
                {
                    type:
                        getAudioMime(
                            format
                        ),
                }
            );

        const duration =
            await getAudioDuration(
                blob
            );

        const suffix =
            operation ===
                "CONVERT"
                ? "converted"
                : operation ===
                    "COMPRESS"
                    ? "compressed"
                    : "trimmed";

        return {
            blob,

            filename:
                createAudioFilename(
                    file.name,
                    suffix,
                    format
                ),

            format,

            mime:
                getAudioMime(
                    format
                ),

            bytes:
                blob.size,

            duration,
        };
    } finally {
        ffmpeg.off(
            "progress",
            progressHandler
        );

        try {
            await ffmpeg.deleteFile(
                inputName
            );
        } catch {
            // Ignore cleanup errors.
        }

        try {
            await ffmpeg.deleteFile(
                outputName
            );
        } catch {
            // Ignore cleanup errors.
        }
    }
}