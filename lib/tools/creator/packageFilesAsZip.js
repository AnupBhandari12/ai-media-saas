import { createResultZip } from "@/lib/tools/batch/createResultZip";

const MAX_FILES = 20;

const MAX_TOTAL_SIZE =
    75 * 1024 * 1024;

export async function packageFilesAsZip(
    files
) {
    if (
        !Array.isArray(files) ||
        files.length === 0
    ) {
        throw new Error(
            "Choose at least one file."
        );
    }

    if (
        files.length >
        MAX_FILES
    ) {
        throw new Error(
            `Choose up to ${MAX_FILES} files.`
        );
    }

    const totalSize =
        files.reduce(
            (sum, file) =>
                sum + file.size,
            0
        );

    if (
        totalSize >
        MAX_TOTAL_SIZE
    ) {
        throw new Error(
            "Combined file size must be 75 MB or smaller."
        );
    }

    const {
        zipBlob,
    } =
        await createResultZip(
            files.map(
                (file) => ({
                    filename:
                        file.name,

                    blob: file,
                })
            ),
            {
                maxTotalBytes:
                    MAX_TOTAL_SIZE,
            }
        );

    return {
        zipBlob,

        fileCount:
            files.length,

        totalSize,
    };
}