import {
    describe,
    expect,
    test,
} from "bun:test";

import {
    videoCutMergeSchema,
} from "../../lib/validation/videoCutMerge.js";

describe(
    "Video cut and merge validation",
    () => {
        test(
            "accepts keep segment",
            () => {
                const result =
                    videoCutMergeSchema.safeParse({
                        operation:
                            "CUT_SEGMENT",

                        mediaId:
                            "media-1",

                        mode:
                            "KEEP",

                        start: 2,
                        end: 8,
                    });

                expect(
                    result.success
                ).toBe(true);
            }
        );

        test(
            "accepts remove segment",
            () => {
                const result =
                    videoCutMergeSchema.safeParse({
                        operation:
                            "CUT_SEGMENT",

                        mediaId:
                            "media-1",

                        mode:
                            "REMOVE",

                        start: 2,
                        end: 8,
                    });

                expect(
                    result.success
                ).toBe(true);
            }
        );

        test(
            "rejects reversed cut range",
            () => {
                const result =
                    videoCutMergeSchema.safeParse({
                        operation:
                            "CUT_SEGMENT",

                        mediaId:
                            "media-1",

                        mode:
                            "REMOVE",

                        start: 8,
                        end: 2,
                    });

                expect(
                    result.success
                ).toBe(false);
            }
        );

        test(
            "accepts 2 to 4 merge videos",
            () => {
                expect(
                    videoCutMergeSchema.safeParse({
                        operation:
                            "MERGE",

                        mediaIds: [
                            "a",
                            "b",
                        ],
                    }).success
                ).toBe(true);

                expect(
                    videoCutMergeSchema.safeParse({
                        operation:
                            "MERGE",

                        mediaIds: [
                            "a",
                            "b",
                            "c",
                            "d",
                        ],
                    }).success
                ).toBe(true);
            }
        );

        test(
            "rejects one or more than four merge videos",
            () => {
                expect(
                    videoCutMergeSchema.safeParse({
                        operation:
                            "MERGE",

                        mediaIds: [
                            "a",
                        ],
                    }).success
                ).toBe(false);

                expect(
                    videoCutMergeSchema.safeParse({
                        operation:
                            "MERGE",

                        mediaIds: [
                            "a",
                            "b",
                            "c",
                            "d",
                            "e",
                        ],
                    }).success
                ).toBe(false);
            }
        );
    }
);