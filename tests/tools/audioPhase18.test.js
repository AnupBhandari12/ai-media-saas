import {
    describe,
    expect,
    test,
} from "bun:test";

import {
    buildAudioCommand,
    createAudioFilename,
    getAudioCodecArgs,
    getAudioMime,
} from "../../lib/audio/audioCommands.js";

describe(
    "Phase 18 audio tools",
    () => {
        test(
            "maps audio mime types",
            () => {
                expect(
                    getAudioMime(
                        "mp3"
                    )
                ).toBe(
                    "audio/mpeg"
                );

                expect(
                    getAudioMime(
                        "wav"
                    )
                ).toBe(
                    "audio/wav"
                );
            }
        );

        test(
            "creates MP3 codec args",
            () => {
                expect(
                    getAudioCodecArgs(
                        "mp3",
                        96
                    )
                ).toEqual([
                    "-c:a",
                    "libmp3lame",
                    "-b:a",
                    "96k",
                ]);
            }
        );

        test(
            "creates conversion command",
            () => {
                const args =
                    buildAudioCommand({
                        operation:
                            "CONVERT",

                        inputName:
                            "input.wav",

                        outputName:
                            "output.mp3",

                        format:
                            "mp3",

                        bitrate: 192,
                    });

                expect(
                    args
                ).toContain(
                    "libmp3lame"
                );

                expect(
                    args.at(-1)
                ).toBe(
                    "output.mp3"
                );
            }
        );

        test(
            "creates trim duration command",
            () => {
                const args =
                    buildAudioCommand({
                        operation:
                            "TRIM",

                        inputName:
                            "input.mp3",

                        outputName:
                            "output.mp3",

                        format:
                            "mp3",

                        start: 2,

                        end: 7,
                    });

                const durationIndex =
                    args.indexOf(
                        "-t"
                    );

                expect(
                    args[
                    durationIndex +
                    1
                    ]
                ).toBe("5");
            }
        );

        test(
            "creates safe filename",
            () => {
                expect(
                    createAudioFilename(
                        "My Song!!.wav",

                        "converted",

                        "mp3"
                    )
                ).toBe(
                    "My-Song-converted.mp3"
                );
            }
        );
    }
);