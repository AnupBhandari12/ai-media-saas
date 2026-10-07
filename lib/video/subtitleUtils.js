function numberOrNull(value) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

function sanitizeText(value) {
    return String(value || "")
        .replaceAll("-->", "→")
        .replace(/\r\n/g, "\n")
        .trim();
}

function getEntries(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (
        Array.isArray(
            payload?.segments
        )
    ) {
        return payload.segments;
    }

    if (
        Array.isArray(
            payload?.transcript
        )
    ) {
        return payload.transcript;
    }

    return [];
}

function createWordChunks(
    words,
    confidence,
    startIndex
) {
    const validWords =
        words.filter(
            (word) =>
                sanitizeText(
                    word?.word
                )
        );

    const chunks = [];

    const MAX_WORDS = 10;

    for (
        let index = 0;
        index <
        validWords.length;
        index += MAX_WORDS
    ) {
        const chunk =
            validWords.slice(
                index,
                index +
                MAX_WORDS
            );

        const start =
            numberOrNull(
                chunk[0]
                    ?.start_time
            );

        const end =
            numberOrNull(
                chunk[
                    chunk.length - 1
                ]?.end_time
            );

        if (
            start === null ||
            end === null ||
            end <= start
        ) {
            continue;
        }

        chunks.push({
            id:
                `cue-${startIndex + chunks.length}`,

            start,
            end,

            text:
                chunk
                    .map(
                        (word) =>
                            sanitizeText(
                                word.word
                            )
                    )
                    .join(" "),

            confidence,
        });
    }

    return chunks;
}

export function transcriptToCues(
    payload
) {
    const entries =
        getEntries(payload);

    const cues = [];

    for (
        const entry of entries
    ) {
        const confidence =
            numberOrNull(
                entry?.confidence
            );

        const words =
            Array.isArray(
                entry?.words
            )
                ? entry.words
                : [];

        if (
            words.length > 0
        ) {
            const chunks =
                createWordChunks(
                    words,
                    confidence,
                    cues.length
                );

            cues.push(
                ...chunks
            );

            continue;
        }

        const text =
            sanitizeText(
                entry?.transcript ??
                entry?.text
            );

        const start =
            numberOrNull(
                entry?.start_time
            );

        const end =
            numberOrNull(
                entry?.end_time
            );

        if (
            !text ||
            start === null ||
            end === null ||
            end <= start
        ) {
            continue;
        }

        cues.push({
            id:
                `cue-${cues.length}`,

            start,
            end,
            text,
            confidence,
        });
    }

    return cues.slice(
        0,
        500
    );
}

function formatTime(
    seconds,
    decimalSeparator
) {
    const safe =
        Math.max(
            0,
            Number(seconds) || 0
        );

    const totalMs =
        Math.round(
            safe * 1000
        );

    const hours =
        Math.floor(
            totalMs /
            3_600_000
        );

    const minutes =
        Math.floor(
            (
                totalMs %
                3_600_000
            ) /
            60_000
        );

    const secs =
        Math.floor(
            (
                totalMs %
                60_000
            ) /
            1000
        );

    const ms =
        totalMs % 1000;

    return [
        String(hours).padStart(
            2,
            "0"
        ),

        String(minutes).padStart(
            2,
            "0"
        ),

        String(secs).padStart(
            2,
            "0"
        ),
    ].join(":") +
        decimalSeparator +
        String(ms).padStart(
            3,
            "0"
        );
}

export function cuesToSrt(
    cues
) {
    return cues
        .filter(
            (cue) =>
                cue.text?.trim() &&
                Number(cue.end) >
                Number(
                    cue.start
                )
        )
        .map(
            (cue, index) =>
                `${index + 1}\n` +
                `${formatTime(
                    cue.start,
                    ","
                )} --> ${formatTime(
                    cue.end,
                    ","
                )}\n` +
                `${sanitizeText(
                    cue.text
                )}\n`
        )
        .join("\n");
}

export function cuesToVtt(
    cues
) {
    const body =
        cues
            .filter(
                (cue) =>
                    cue.text?.trim() &&
                    Number(
                        cue.end
                    ) >
                    Number(
                        cue.start
                    )
            )
            .map(
                (cue) =>
                    `${formatTime(
                        cue.start,
                        "."
                    )} --> ${formatTime(
                        cue.end,
                        "."
                    )}\n` +
                    `${sanitizeText(
                        cue.text
                    )}\n`
            )
            .join("\n");

    return `WEBVTT\n\n${body}`;
}

export function cueListIsValid(
    cues
) {
    return (
        Array.isArray(cues) &&
        cues.length > 0 &&
        cues.every(
            (cue) =>
                cue.text?.trim() &&
                Number.isFinite(
                    Number(
                        cue.start
                    )
                ) &&
                Number.isFinite(
                    Number(
                        cue.end
                    )
                ) &&
                Number(
                    cue.start
                ) >= 0 &&
                Number(
                    cue.end
                ) >
                Number(
                    cue.start
                )
        )
    );
}