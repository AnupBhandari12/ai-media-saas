import {
    describe,
    expect,
    test,
} from "bun:test";

import { brandKitSchema } from "../../lib/validation/brandKit.js";

const validBrandKit = {
    brandName:
        "Bhanova Technologies",

    primaryColor:
        "#4f46e5",

    secondaryColor:
        "#0891b2",

    logoPublicId:
        null,

    defaultWatermarkType:
        "TEXT",

    defaultWatermarkText:
        "© Bhanova",

    defaultWatermarkOpacity:
        25,

    defaultWatermarkSize:
        20,

    defaultWatermarkPosition:
        "BOTTOM_RIGHT",
};

describe(
    "Brand Kit validation",
    () => {
        test(
            "accepts valid settings",
            () => {
                const result =
                    brandKitSchema.safeParse(
                        validBrandKit
                    );

                expect(
                    result.success
                ).toBe(true);
            }
        );

        test(
            "rejects invalid color",
            () => {
                const result =
                    brandKitSchema.safeParse({
                        ...validBrandKit,

                        primaryColor:
                            "red",
                    });

                expect(
                    result.success
                ).toBe(false);
            }
        );

        test(
            "rejects invalid opacity",
            () => {
                const result =
                    brandKitSchema.safeParse({
                        ...validBrandKit,

                        defaultWatermarkOpacity:
                            150,
                    });

                expect(
                    result.success
                ).toBe(false);
            }
        );

        test(
            "requires logo for logo watermark",
            () => {
                const result =
                    brandKitSchema.safeParse({
                        ...validBrandKit,

                        defaultWatermarkType:
                            "LOGO",

                        logoPublicId:
                            null,
                    });

                expect(
                    result.success
                ).toBe(false);
            }
        );

        test(
            "accepts logo watermark when logo exists",
            () => {
                const result =
                    brandKitSchema.safeParse({
                        ...validBrandKit,

                        defaultWatermarkType:
                            "LOGO",

                        logoPublicId:
                            "ai-media/user/brand-kit/logo",
                    });

                expect(
                    result.success
                ).toBe(true);
            }
        );
    }
);