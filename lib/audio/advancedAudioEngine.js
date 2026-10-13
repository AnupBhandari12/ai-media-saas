
import {
    getAudioDuration,
    getFFmpeg,
} from "@/lib/audio/ffmpegAudio";

import {
    createAudioFilename,
} from "@/lib/audio/audioCommands";

import {
    buildAdvancedAudioCommand,
} from "@/lib/audio/audioAdvancedCommands";

let isRunning = false;

function extensionOf(file) {
    return file.name.split(".").pop()?.toLowerCase() || "mp3";
}

// Sampled RMS measurement is not the same as LUFS.
// It is used only for a before/after comparison.
async function analyzeAudioLevel(blob) {
    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return null;

    const context = new AudioContextClass();

    try {
        const bytes = await blob.arrayBuffer();
        const decoded = await context.decodeAudioData(bytes);

        let sumSquares = 0;
        let count = 0;
        let peak = 0;

        for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
            const samples = decoded.getChannelData(channel);

            // Sample every fourth value to keep analysis bounded.
            for (let index = 0; index < samples.length; index += 4) {
                const value = samples[index];
                sumSquares += value * value;
                peak = Math.max(peak, Math.abs(value));
                count++;
            }
        }

        if (!count) return null;

        const rms = Math.sqrt(sumSquares / count);

        return {
            rmsDb: Number(
                (20 * Math.log10(Math.max(rms, 0.000001))).toFixed(2),
            ),
            peakDb: Number(
                (20 * Math.log10(Math.max(peak, 0.000001))).toFixed(2),
            ),
        };
    } catch {
        return null;
    } finally {
        await context.close().catch(() => { });
    }
}

export async function processAdvancedAudio({
    files,
    operation,
    strength = "GENTLE",
    onProgress,
}) {
    if (isRunning) {
        throw new Error("Another audio operation is still running.");
    }

    isRunning = true;

    let ffmpeg = null;
    let inputNames = [];
    let outputName = "";
    let progressHandler = null;
    let logHandler = null;

    try {
        if (!Array.isArray(files) || !files.length) {
            throw new Error("Please select an audio file.");
        }

        ffmpeg = await getFFmpeg();

        const { fetchFile } = await import("@ffmpeg/util");

        const unique = `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;

        inputNames = files.map(
            (file, index) =>
                `advanced-${unique}-${index}.${extensionOf(file)}`,
        );

        outputName = `advanced-result-${unique}.mp3`;

        let lastError = "";

        progressHandler = ({ progress }) => {
            if (Number.isFinite(progress)) {
                onProgress?.(
                    Math.min(99, Math.max(0, Math.round(progress * 100))),
                );
            }
        };

        logHandler = ({ message }) => {
            if (/No such filter|Error|not found|Invalid argument/i.test(message)) {
                lastError = message.slice(-250);
            }
        };

        ffmpeg.on("progress", progressHandler);
        ffmpeg.on("log", logHandler);

        for (let index = 0; index < files.length; index++) {
            await ffmpeg.writeFile(
                inputNames[index],
                await fetchFile(files[index]),
            );
        }

        const command = buildAdvancedAudioCommand({
            operation,
            inputNames,
            outputName,
            strength,
        });

        // Get approximate RMS comparison for normalization.
        const beforeLevel =
            operation === "NORMALIZE"
                ? await analyzeAudioLevel(files[0])
                : null;

        const exitCode = await ffmpeg.exec(command);

        if (exitCode !== 0) {
            throw new Error(
                lastError ||
                "FFmpeg failed. Check whether the filter is supported by your browser FFmpeg core.",
            );
        }

        const data = await ffmpeg.readFile(outputName);

        const blob = new Blob([data], {
            type: "audio/mpeg",
        });

        if (!blob.size) {
            throw new Error("The processed audio file is empty.");
        }

        const duration = await getAudioDuration(blob);

        const afterLevel =
            operation === "NORMALIZE"
                ? await analyzeAudioLevel(blob)
                : null;

        const suffix = {
            MERGE: "merged",
            NORMALIZE: "normalized",
            DENOISE: "cleaned",
        }[operation];

        return {
            blob,
            filename: createAudioFilename(
                files[0].name,
                suffix,
                "mp3",
            ),
            format: "mp3",
            mime: "audio/mpeg",
            bytes: blob.size,
            duration,
            originalBytes: files.reduce(
                (sum, file) => sum + file.size,
                0,
            ),
            rmsBeforeDb: beforeLevel?.rmsDb ?? null,
            rmsAfterDb: afterLevel?.rmsDb ?? null,
            peakAfterDb: afterLevel?.peakDb ?? null,
            operation,
        };
    } finally {
        if (ffmpeg && progressHandler) {
            ffmpeg.off("progress", progressHandler);
        }

        if (ffmpeg && logHandler) {
            ffmpeg.off("log", logHandler);
        }

        if (ffmpeg) {
            for (const name of [...inputNames, outputName]) {
                if (!name) continue;

                try {
                    await ffmpeg.deleteFile(name);
                } catch {
                    // Do not hide the original processing error.
                }
            }
        }

        isRunning = false;
    }
}
