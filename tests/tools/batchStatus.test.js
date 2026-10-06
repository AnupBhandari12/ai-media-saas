import {
    describe,
    expect,
    test,
} from "bun:test";

import {
    BATCH_ITEM_STATUS,
    createBatchItems,
} from "../../lib/tools/batch/status.js";

describe("batch item status", () => {
    test("creates queued items", () => {
        const items =
            createBatchItems([
                {
                    id: "one",
                },
                {
                    id: "two",
                },
            ]);

        expect(
            items
        ).toHaveLength(2);

        expect(
            items[0].status
        ).toBe(
            BATCH_ITEM_STATUS.QUEUED
        );

        expect(
            items[0].error
        ).toBe("");
    });
});