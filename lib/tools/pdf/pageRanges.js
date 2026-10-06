export function parsePageSelection(
    input,
    pageCount,
    maxPages = 25
) {
    const totalPages =
        Number(pageCount);

    if (
        !Number.isInteger(totalPages) ||
        totalPages < 1
    ) {
        throw new Error(
            "The PDF has an invalid page count."
        );
    }

    const raw =
        String(input || "")
            .trim()
            .toLowerCase();

    if (
        raw === "" ||
        raw === "all"
    ) {
        if (
            totalPages >
            maxPages
        ) {
            throw new Error(
                `Browser mode can convert up to ${maxPages} pages per run. Enter a smaller range such as 1-${maxPages}.`
            );
        }

        return Array.from(
            {
                length:
                    totalPages,
            },
            (_, index) =>
                index + 1
        );
    }

    const selectedPages =
        new Set();

    const parts =
        raw.split(",");

    for (const partValue of parts) {
        const part =
            partValue.trim();

        if (!part) {
            throw new Error(
                "Page selection contains an empty value."
            );
        }

        if (
            /^\d+$/.test(part)
        ) {
            const page =
                Number(part);

            if (
                page < 1 ||
                page >
                totalPages
            ) {
                throw new Error(
                    `Page ${page} is outside this PDF. It has ${totalPages} pages.`
                );
            }

            selectedPages.add(
                page
            );

            continue;
        }

        if (
            /^\d+\s*-\s*\d+$/.test(
                part
            )
        ) {
            const [
                startRaw,
                endRaw,
            ] = part.split("-");

            const start =
                Number(
                    startRaw.trim()
                );

            const end =
                Number(
                    endRaw.trim()
                );

            if (
                start < 1 ||
                end < 1 ||
                start >
                totalPages ||
                end >
                totalPages
            ) {
                throw new Error(
                    `Range ${start}-${end} is outside this ${totalPages}-page PDF.`
                );
            }

            if (start > end) {
                throw new Error(
                    `Range ${start}-${end} must start with the smaller page number.`
                );
            }

            for (
                let page = start;
                page <= end;
                page += 1
            ) {
                selectedPages.add(
                    page
                );
            }

            continue;
        }

        throw new Error(
            `"${part}" is not a valid page or range. Use values like 1-3,5,8.`
        );
    }

    const pages = [
        ...selectedPages,
    ].sort(
        (a, b) => a - b
    );

    if (
        pages.length === 0
    ) {
        throw new Error(
            "Choose at least one page."
        );
    }

    if (
        pages.length >
        maxPages
    ) {
        throw new Error(
            `Browser mode can convert up to ${maxPages} pages per run.`
        );
    }

    return pages;
}