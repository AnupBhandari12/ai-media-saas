import {
    describe,
    expect,
    test,
} from "bun:test";

import {
    combinePdfPageTexts,
    countWords,
    normalizePdfTextItems,
} from "../../lib/tools/pdf/textUtils.js";

describe("PDF text helpers", () => {
    test("normalizes PDF text items", () => {
        expect(
            normalizePdfTextItems([
                {
                    str: "Hello",
                    hasEOL: false,
                },
                {
                    str: "world",
                    hasEOL: true,
                },
                {
                    str: "Next",
                    hasEOL: false,
                },
            ])
        ).toBe(
            "Hello world\nNext"
        );
    });

    test("combines page text with page labels", () => {
        expect(
            combinePdfPageTexts([
                {
                    pageNumber: 1,
                    text: "First page",
                },
                {
                    pageNumber: 3,
                    text: "Third page",
                },
            ])
        ).toBe(
            "--- Page 1 ---\nFirst page\n\n--- Page 3 ---\nThird page"
        );
    });

    test("counts words", () => {
        expect(
            countWords(
                "one two\nthree"
            )
        ).toBe(3);
    });

    test("empty text has zero words", () => {
        expect(
            countWords("   ")
        ).toBe(0);
    });
});