import {
    describe,
    expect,
    test,
} from "bun:test";

import {
    getBeautifiedDimensions,
    normalizeScreenshotSettings,
} from "../../lib/tools/creator/screenshotBeautifier.js";

describe(
    "Screenshot Beautifier helpers",
    () => {
        test(
            "normalizes invalid settings",
            () => {
                const settings =
                    normalizeScreenshotSettings({
                        theme:
                            "INVALID",

                        frame:
                            "INVALID",

                        padding:
                            999,

                        cornerRadius:
                            100,

                        shadowStrength:
                            -10,

                        backgroundAngle:
                            500,

                        outputFormat:
                            "gif",
                    });

                expect(
                    settings.theme
                ).toBe(
                    "INDIGO"
                );

                expect(
                    settings.frame
                ).toBe(
                    "CARD"
                );

                expect(
                    settings.padding
                ).toBe(96);

                expect(
                    settings.cornerRadius
                ).toBe(48);

                expect(
                    settings.shadowStrength
                ).toBe(0);

                expect(
                    settings.backgroundAngle
                ).toBe(360);

                expect(
                    settings.outputFormat
                ).toBe("png");
            }
        );

        test(
            "card output preserves screenshot dimensions",
            () => {
                const dimensions =
                    getBeautifiedDimensions(
                        1440,
                        900,
                        {
                            padding: 96,
                            frame: "CARD",
                        }
                    );

                expect(
                    dimensions.width
                ).toBe(1632);

                expect(
                    dimensions.height
                ).toBe(1092);

                expect(
                    dimensions.browserBarHeight
                ).toBe(0);
            }
        );

        test(
            "browser frame adds chrome height",
            () => {
                const dimensions =
                    getBeautifiedDimensions(
                        1440,
                        900,
                        {
                            padding: 96,
                            frame:
                                "BROWSER",
                        }
                    );

                expect(
                    dimensions.width
                ).toBe(1632);

                expect(
                    dimensions.height
                ).toBe(1164);

                expect(
                    dimensions.browserBarHeight
                ).toBe(72);
            }
        );
    }
);