import {
    describe,
    expect,
    test,
} from "bun:test";

import {
    cueListIsValid,
    cuesToSrt,
    cuesToVtt,
    transcriptToCues,
} from "../../lib/video/subtitleUtils.js";

import {
    videoSubtitleSchema,
} from "../../lib/validation/videoSubtitles.js";

describe(
    "Auto subtitles",
    () => {
        test(
            "parses transcript words into timed cues",
            () => {
                const cues =
                    transcriptToCues([
                        {
                            transcript:
                                "hello world from ai media",

                            confidence:
                                0.95,

                            words: [
                                {
                                    word:
                                        "hello",

                                    start_time:
                                        0,

                                    end_time:
                                        0.4,
                                },

                                {
                                    word:
                                        "world",

                                    start_time:
                                        0.4,

                                    end_time:
                                        0.8,
                                },

                                {
                                    word:
                                        "from",

                                    start_time:
                                        0.8,

                                    end_time:
                                        1,
                                },

                                {
                                    word:
                                        "ai",

                                    start_time:
                                        1,

                                    end_time:
                                        1.2,
                                },

                                {
                                    word:
                                        "media",

                                    start_time:
                                        1.2,

                                    end_time:
                                        1.5,
                                },
                            ],
                        },
                    ]);

                expect(
                    cues
                ).toHaveLength(1);

                expect(
                    cues[0].text
                ).toBe(
                    "hello world from ai media"
                );

                expect(
                    cues[0].start
                ).toBe(0);

                expect(
                    cues[0].end
                ).toBe(1.5);
            }
        );

        test(
            "creates valid VTT",
            () => {
                const value =
                    cuesToVtt([
                        {
                            id: "1",

                            start: 1,

                            end: 2.5,

                            text:
                                "Hello world",
                        },
                    ]);

                expect(
                    value.startsWith(
                        "WEBVTT"
                    )
                ).toBe(true);

                expect(
                    value
                ).toContain(
                    "00:00:01.000 --> 00:00:02.500"
                );
            }
        );

        test(
            "creates valid SRT timing",
            () => {
                const value =
                    cuesToSrt([
                        {
                            id: "1",

                            start: 1,

                            end: 2.5,

                            text:
                                "Hello world",
                        },
                    ]);

                expect(
                    value
                ).toContain(
                    "00:00:01,000 --> 00:00:02,500"
                );
            }
        );

        test(
            "validates cue list",
            () => {
                expect(
                    cueListIsValid([
                        {
                            start: 0,

                            end: 2,

                            text:
                                "Valid",
                        },
                    ])
                ).toBe(true);

                expect(
                    cueListIsValid([
                        {
                            start: 2,

                            end: 1,

                            text:
                                "Invalid",
                        },
                    ])
                ).toBe(false);
            }
        );

        test(
            "accepts subtitle start request",
            () => {
                const result =
                    videoSubtitleSchema.safeParse({
                        action:
                            "START",

                        mediaId:
                            "media-1",

                        language:
                            "AUTO",

                        regenerate:
                            false,
                    });

                expect(
                    result.success
                ).toBe(true);
            }
        );

        test(
            "rejects invalid burn cue",
            () => {
                const result =
                    videoSubtitleSchema.safeParse({
                        action:
                            "BURN",

                        jobId:
                            "job-1",

                        mediaId:
                            "media-1",

                        cues: [
                            {
                                id: "1",

                                start: 4,

                                end: 2,

                                text:
                                    "Bad timing",
                            },
                        ],

                        style: {
                            fontSize: 32,

                            color:
                                "#ffffff",

                            position:
                                "BOTTOM",
                        },
                    });

                expect(
                    result.success
                ).toBe(false);
            }
        );
    }
);