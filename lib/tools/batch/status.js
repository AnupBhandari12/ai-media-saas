export const BATCH_ITEM_STATUS = {
    QUEUED: "QUEUED",
    PROCESSING: "PROCESSING",
    SUCCESS: "SUCCESS",
    ERROR: "ERROR",
};

export function createBatchItems(items) {
    return items.map((item) => ({
        ...item,
        status:
            BATCH_ITEM_STATUS.QUEUED,
        error: "",
    }));
}