import {
    describe,
    expect,
    test,
} from "bun:test";

import { parseSplitRanges } from "../../lib/tools/pdf/splitRanges.js";

describe("PDF split ranges", () => {
    test("parses multiple ranges", () => {
        expect(
            parseSplitRanges(
                "1-3,4-6,8",
                10
            )
        ).toEqual([
            {
                label: "1-3",
                pages: [
                    1,
                    2,
                    3,
                ],
            },
            {
                label: "4-6",
                pages: [
                    4,
                    5,
                    6,
                ],
            },
            {
                label: "8",
                pages: [8],
            },
        ]);
    });

    test("allows requested overlap", () => {
        expect(
            parseSplitRanges(
                "1-3,3-5",
                5
            )[1].pages
        ).toEqual([
            3,
            4,
            5,
        ]);
    });

    test("rejects outside pages", () => {
        expect(() =>
            parseSplitRanges(
                "1-8",
                6
            )
        ).toThrow();
    });

    test("rejects reversed ranges", () => {
        expect(() =>
            parseSplitRanges(
                "5-2",
                6
            )
        ).toThrow();
    });

    test("rejects invalid syntax", () => {
        expect(() =>
            parseSplitRanges(
                "1-three",
                6
            )
        ).toThrow();
    });
});