import {
    describe,
    expect,
    test,
} from "bun:test";

import {
    brandPositionToBulk,
    createBulkWatermarkFilename,
    normalizeBulkWatermarkSettings,
} from "../../lib/tools/creator/bulkWatermark.js";

describe(
    "Bulk Watermark helpers",
    () => {
        test(
            "maps Brand Kit position",
            () => {
                expect(
                    brandPositionToBulk(
                        "BOTTOM_RIGHT"
                    )
                ).toBe(
                    "bottom-right"
                );

                expect(
                    brandPositionToBulk(
                        "TOP_CENTER"
                    )
                ).toBe(
                    "top-center"
                );

                expect(
                    brandPositionToBulk(
                        "INVALID"
                    )
                ).toBe(
                    "bottom-right"
                );
            }
        );

        test(
            "normalizes watermark settings",
            () => {
                const result =
                    normalizeBulkWatermarkSettings({
                        type:
                            "invalid",

                        position:
                            "invalid",

                        opacity:
                            200,

                        sizePercent:
                            1,

                        color:
                            "white",
                    });

                expect(
                    result.type
                ).toBe("text");

                expect(
                    result.position
                ).toBe(
                    "bottom-right"
                );

                expect(
                    result.opacity
                ).toBe(100);

                expect(
                    result.sizePercent
                ).toBe(5);

                expect(
                    result.color
                ).toBe(
                    "#ffffff"
                );
            }
        );

        test(
            "creates output filename from MIME type",
            () => {
                expect(
                    createBulkWatermarkFilename({
                        name:
                            "photo.final.png",

                        type:
                            "image/png",
                    })
                ).toBe(
                    "photo.final-watermarked.png"
                );

                expect(
                    createBulkWatermarkFilename({
                        name:
                            "camera.jpeg",

                        type:
                            "image/jpeg",
                    })
                ).toBe(
                    "camera-watermarked.jpg"
                );
            }
        );
    }
);