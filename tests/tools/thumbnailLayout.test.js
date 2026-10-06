import {
  describe,
  expect,
  test,
} from "bun:test";

import {
  getCoverPlacement,
  normalizeThumbnailSettings,
} from "../../lib/tools/creator/thumbnailLayout.js";

describe(
  "YouTube thumbnail layout",
  () => {
    test(
      "normalizes unsafe values",
      () => {
        const settings =
          normalizeThumbnailSettings({
            template:
              "INVALID",

            focusX: 150,
            focusY: -20,

            overlayOpacity:
              200,

            titleColor:
              "red",

            outputFormat:
              "gif",
          });

        expect(
          settings.template
        ).toBe(
          "BOLD_LEFT"
        );

        expect(
          settings.focusX
        ).toBe(100);

        expect(
          settings.focusY
        ).toBe(0);

        expect(
          settings.overlayOpacity
        ).toBe(80);

        expect(
          settings.titleColor
        ).toBe(
          "#ffffff"
        );

        expect(
          settings.outputFormat
        ).toBe("jpg");
      }
    );

    test(
      "cover placement fills landscape canvas",
      () => {
        const placement =
          getCoverPlacement(
            1000,
            1000,
            1280,
            720,
            50,
            50
          );

        expect(
          placement.width
        ).toBe(1280);

        expect(
          placement.height
        ).toBe(1280);

        expect(
          placement.y
        ).toBe(-280);
      }
    );

    test(
      "focus changes crop position",
      () => {
        const left =
          getCoverPlacement(
            2000,
            1000,
            1280,
            720,
            0,
            50
          );

        const right =
          getCoverPlacement(
            2000,
            1000,
            1280,
            720,
            100,
            50
          );

        expect(
          left.x
        ).toBe(0);

        expect(
          right.x
        ).toBeLessThan(0);
      }
    );
  }
);