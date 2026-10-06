import {
    describe,
    expect,
    test,
} from "bun:test";

import { parsePageSelection } from "../../lib/tools/pdf/pageRanges.js";

describe("PDF page selection", () => {
    test("selects all pages", () => {
        expect(
            parsePageSelection(
                "all",
                4
            )
        ).toEqual([
            1,
            2,
            3,
            4,
        ]);
    });

    test("parses pages and ranges", () => {
        expect(
            parsePageSelection(
                "1-3,5,8",
                10
            )
        ).toEqual([
            1,
            2,
            3,
            5,
            8,
        ]);
    });

    test("removes duplicate pages", () => {
        expect(
            parsePageSelection(
                "3,1,3,1-2",
                5
            )
        ).toEqual([
            1,
            2,
            3,
        ]);
    });

    test("rejects pages outside the PDF", () => {
        expect(() =>
            parsePageSelection(
                "1-6",
                5
            )
        ).toThrow();
    });

    test("rejects reversed ranges", () => {
        expect(() =>
            parsePageSelection(
                "5-2",
                10
            )
        ).toThrow();
    });

    test("enforces browser page limit", () => {
        expect(() =>
            parsePageSelection(
                "all",
                30,
                25
            )
        ).toThrow();
    });
});