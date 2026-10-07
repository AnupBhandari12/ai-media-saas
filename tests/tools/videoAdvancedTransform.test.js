import {
    describe,
    expect,
    test,
} from "bun:test";

import {
    videoAdvancedTransformSchema,
} from "../../lib/validation/videoAdvancedTransform.js";

describe(
    "Advanced video transform validation",
    () => {
        test(
            "accepts crop",
            () => {
                const result =
                    videoAdvancedTransformSchema.safeParse({
                        operation:
                            "CROP",

                        mediaId:
                            "media-1",

                        left: 10,
                        top: 10,

                        width: 80,
                        height: 80,
                    });

                expect(
                    result.success
                ).toBe(true);
            }
        );

        test(
            "rejects crop outside frame",
            () => {
                const result =
                    videoAdvancedTransformSchema.safeParse({
                        operation:
                            "CROP",

                        mediaId:
                            "media-1",

                        left: 60,
                        top: 0,

                        width: 60,
                        height: 100,
                    });

                expect(
                    result.success
                ).toBe(false);
            }
        );

        test(
            "accepts text watermark",
            () => {
                const result =
                    videoAdvancedTransformSchema.safeParse({
                        operation:
                            "WATERMARK",

                        mediaId:
                            "media-1",

                        type:
                            "TEXT",

                        text:
                            "Bhanova",

                        position:
                            "BOTTOM_RIGHT",

                        opacity: 60,

                        sizePercent:
                            15,

                        color:
                            "#ffffff",
                    });

                expect(
                    result.success
                ).toBe(true);
            }
        );

        test(
            "rejects empty text watermark",
            () => {
                const result =
                    videoAdvancedTransformSchema.safeParse({
                        operation:
                            "WATERMARK",

                        mediaId:
                            "media-1",

                        type:
                            "TEXT",

                        text: "",

                        position:
                            "CENTER",

                        opacity: 60,

                        sizePercent:
                            15,

                        color:
                            "#ffffff",
                    });

                expect(
                    result.success
                ).toBe(false);
            }
        );

        test(
            "accepts logo watermark",
            () => {
                const result =
                    videoAdvancedTransformSchema.safeParse({
                        operation:
                            "WATERMARK",

                        mediaId:
                            "media-1",

                        type:
                            "LOGO",

                        text: null,

                        position:
                            "TOP_RIGHT",

                        opacity: 70,

                        sizePercent:
                            12,

                        color:
                            "#ffffff",
                    });

                expect(
                    result.success
                ).toBe(true);
            }
        );
    }
);