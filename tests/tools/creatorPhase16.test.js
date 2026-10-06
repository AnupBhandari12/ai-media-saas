import {
    describe,
    expect,
    test,
} from "bun:test";

import {
    normalizeMemeSettings,
} from "../../lib/tools/creator/memeMaker.js";

import {
    getPosterTemplate,
    normalizePosterSettings,
} from "../../lib/tools/creator/posterBanner.js";

describe(
    "Phase 16 creator helpers",
    () => {
        test(
            "normalizes meme settings",
            () => {
                const settings =
                    normalizeMemeSettings({
                        customY: 200,
                        fontScale: 1,
                        textColor:
                            "red",
                        outputFormat:
                            "gif",
                    });

                expect(
                    settings.customY
                ).toBe(90);

                expect(
                    settings.fontScale
                ).toBe(4);

                expect(
                    settings.textColor
                ).toBe(
                    "#ffffff"
                );

                expect(
                    settings.outputFormat
                ).toBe("png");
            }
        );

        test(
            "uses landscape poster by default",
            () => {
                const template =
                    getPosterTemplate(
                        "INVALID"
                    );

                expect(
                    template.id
                ).toBe(
                    "BUSINESS_BANNER"
                );

                expect(
                    template.width
                ).toBe(1200);

                expect(
                    template.height
                ).toBe(628);
            }
        );

        test(
            "normalizes poster values",
            () => {
                const settings =
                    normalizePosterSettings({
                        template:
                            "STORY_PROMO",

                        focusX: 150,
                        focusY: -10,

                        overlayOpacity:
                            100,

                        primaryColor:
                            "purple",

                        outputFormat:
                            "gif",
                    });

                expect(
                    settings.template
                ).toBe(
                    "STORY_PROMO"
                );

                expect(
                    settings.focusX
                ).toBe(100);

                expect(
                    settings.focusY
                ).toBe(0);

                expect(
                    settings.overlayOpacity
                ).toBe(85);

                expect(
                    settings.primaryColor
                ).toBe(
                    "#4f46e5"
                );

                expect(
                    settings.outputFormat
                ).toBe("png");
            }
        );
    }
);