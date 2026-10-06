export function parseSplitRanges(
    input,
    pageCount,
    maxOutputs = 20
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
        String(input || "").trim();

    if (!raw) {
        throw new Error(
            "Enter at least one page range."
        );
    }

    const parts = raw
        .split(",")
        .map((part) =>
            part.trim()
        );

    if (
        parts.some(
            (part) => !part
        )
    ) {
        throw new Error(
            "The split ranges contain an empty value."
        );
    }

    if (
        parts.length >
        maxOutputs
    ) {
        throw new Error(
            `You can create up to ${maxOutputs} split files at once.`
        );
    }

    return parts.map(
        (part) => {
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
                        `Page ${page} is outside this ${totalPages}-page PDF.`
                    );
                }

                return {
                    label:
                        String(page),

                    pages: [
                        page,
                    ],
                };
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

                if (
                    start > end
                ) {
                    throw new Error(
                        `Range ${start}-${end} must start with the smaller page number.`
                    );
                }

                return {
                    label:
                        `${start}-${end}`,

                    pages:
                        Array.from(
                            {
                                length:
                                    end -
                                    start +
                                    1,
                            },
                            (
                                _,
                                index
                            ) =>
                                start +
                                index
                        ),
                };
            }

            throw new Error(
                `"${part}" is not valid. Use ranges like 1-3,4-8,10.`
            );
        }
    );
}