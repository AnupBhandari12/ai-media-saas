
import { describe, expect, test } from "bun:test";

import {
    buildAdvancedAudioCommand,
    NOISE_PRESETS,
} from "../../lib/audio/audioAdvancedCommands.js";

describe("Phase 18B advanced audio", () => {
    test("merges two audio inputs in order", () => {
        const args = buildAdvancedAudioCommand({
            operation: "MERGE",
            inputNames: ["a.mp3", "b.wav"],
            outputName: "merged.mp3",
        });

        const filter = args[args.indexOf("-filter_complex") + 1];

        expect(filter).toContain("[0:a:0]");
        expect(filter).toContain("[1:a:0]");
        expect(filter).toContain(
            "[a0][a1]concat=n=2:v=0:a=1[outa]",
        );
        expect(args.at(-1)).toBe("merged.mp3");
    });

    test("rejects merging only one file", () => {
        expect(() =>
            buildAdvancedAudioCommand({
                operation: "MERGE",
                inputNames: ["a.mp3"],
                outputName: "merged.mp3",
            }),
        ).toThrow();
    });

    test("rejects more than four files", () => {
        expect(() =>
            buildAdvancedAudioCommand({
                operation: "MERGE",
                inputNames: ["a", "b", "c", "d", "e"],
                outputName: "merged.mp3",
            }),
        ).toThrow();
    });

    test("uses safe loudness normalization settings", () => {
        const args = buildAdvancedAudioCommand({
            operation: "NORMALIZE",
            inputNames: ["voice.wav"],
            outputName: "normalized.mp3",
        });

        expect(args).toContain("loudnorm=I=-16:TP=-2:LRA=11");
    });

    test("supports conservative denoise presets", () => {
        expect(NOISE_PRESETS).toHaveLength(2);

        const args = buildAdvancedAudioCommand({
            operation: "DENOISE",
            inputNames: ["voice.wav"],
            outputName: "cleaned.mp3",
            strength: "GENTLE",
        });

        expect(args.join(" ")).toContain("afftdn=nr=6");
    });

    test("rejects unknown denoise preset", () => {
        expect(() =>
            buildAdvancedAudioCommand({
                operation: "DENOISE",
                inputNames: ["voice.wav"],
                outputName: "cleaned.mp3",
                strength: "EXTREME",
            }),
        ).toThrow();
    });
});
