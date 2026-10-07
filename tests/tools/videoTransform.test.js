import {
    describe,
    expect,
    test,
} from "bun:test";

import {
    videoTransformSchema,
} from "../../lib/validation/videoTransform.js";

describe(
    "Video transform validation",
    () => {
        test(
            "accepts compression",
            () => {
                const result =
                    videoTransformSchema.safeParse({
                        operation:
                            "COMPRESS",

                        mediaId:
                            "media-1",

                        preset:
                            "BALANCED",
                    });

                expect(
                    result.success
                ).toBe(true);
            }
        );

        test(
            "rejects invalid compression preset",
            () => {
                const result =
                    videoTransformSchema.safeParse({
                        operation:
                            "COMPRESS",

                        mediaId:
                            "media-1",

                        preset:
                            "EXTREME",
                    });

                expect(
                    result.success
                ).toBe(false);
            }
        );

        test(
            "accepts video conversion",
            () => {
                const result =
                    videoTransformSchema.safeParse({
                        operation:
                            "CONVERT",

                        mediaId:
                            "media-1",

                        format:
                            "webm",
                    });

                expect(
                    result.success
                ).toBe(true);
            }
        );

        test(
            "accepts valid trim range",
            () => {
                const result =
                    videoTransformSchema.safeParse({
                        operation:
                            "TRIM",

                        mediaId:
                            "media-1",

                        start: 2,
                        end: 8,
                    });

                expect(
                    result.success
                ).toBe(true);
            }
        );

        test(
            "rejects reversed trim range",
            () => {
                const result =
                    videoTransformSchema.safeParse({
                        operation:
                            "TRIM",

                        mediaId:
                            "media-1",

                        start: 8,
                        end: 2,
                    });

                expect(
                    result.success
                ).toBe(false);
            }
        );

        test(
            "accepts social resize",
            () => {
                const result =
                    videoTransformSchema.safeParse({
                        operation:
                            "SOCIAL_RESIZE",

                        mediaId:
                            "media-1",

                        preset:
                            "VERTICAL",

                        mode:
                            "FILL",

                        gravity:
                            "CENTER",
                    });

                expect(
                    result.success
                ).toBe(true);
            }
        );

        test(
            "accepts rotation",
            () => {
                const result =
                    videoTransformSchema.safeParse({
                        operation:
                            "ROTATE",

                        mediaId:
                            "media-1",

                        angle: 90,
                    });

                expect(
                    result.success
                ).toBe(true);
            }
        );

        test(
            "rejects unsupported rotation",
            () => {
                const result =
                    videoTransformSchema.safeParse({
                        operation:
                            "ROTATE",

                        mediaId:
                            "media-1",

                        angle: 45,
                    });

                expect(
                    result.success
                ).toBe(false);
            }
        );

        test(
            "accepts mute",
            () => {
                const result =
                    videoTransformSchema.safeParse({
                        operation:
                            "MUTE",

                        mediaId:
                            "media-1",
                    });

                expect(
                    result.success
                ).toBe(true);
            }
        );

        test(
            "accepts frame extraction",
            () => {
                const result =
                    videoTransformSchema.safeParse({
                        operation:
                            "FRAME",

                        mediaId:
                            "media-1",

                        time: 4.5,

                        format:
                            "jpg",
                    });

                expect(
                    result.success
                ).toBe(true);
            }
        );
    }
);