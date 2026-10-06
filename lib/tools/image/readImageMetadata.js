const SUPPORTED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

function formatGpsCoordinate(
    values,
    reference
) {
    if (
        !Array.isArray(values) ||
        values.length < 3
    ) {
        return null;
    }

    let coordinate =
        values[0] +
        values[1] / 60 +
        values[2] / 3600;

    if (
        reference === "S" ||
        reference === "W"
    ) {
        coordinate *= -1;
    }

    return coordinate;
}

function parseJpegExif(buffer) {
    const view =
        new DataView(buffer);

    const result = {
        hasExif: false,
        hasGps: false,

        make: null,
        model: null,
        dateTime: null,
        dateTimeOriginal: null,
        orientation: null,

        latitude: null,
        longitude: null,
    };

    if (
        view.byteLength < 4 ||
        view.getUint16(
            0,
            false
        ) !== 0xffd8
    ) {
        return result;
    }

    let offset = 2;

    while (
        offset + 4 <=
        view.byteLength
    ) {
        if (
            view.getUint8(offset) !==
            0xff
        ) {
            break;
        }

        const marker =
            view.getUint8(
                offset + 1
            );

        if (
            marker === 0xda ||
            marker === 0xd9
        ) {
            break;
        }

        const segmentLength =
            view.getUint16(
                offset + 2,
                false
            );

        if (
            segmentLength < 2
        ) {
            break;
        }

        const segmentStart =
            offset + 4;

        const segmentEnd =
            offset +
            2 +
            segmentLength;

        if (
            segmentEnd >
            view.byteLength
        ) {
            break;
        }

        if (
            marker === 0xe1 &&
            segmentStart + 6 <=
            segmentEnd
        ) {
            const signature =
                String.fromCharCode(
                    view.getUint8(
                        segmentStart
                    ),
                    view.getUint8(
                        segmentStart + 1
                    ),
                    view.getUint8(
                        segmentStart + 2
                    ),
                    view.getUint8(
                        segmentStart + 3
                    )
                );

            if (
                signature === "Exif"
            ) {
                result.hasExif = true;

                const tiffOffset =
                    segmentStart + 6;

                parseTiffExif(
                    view,
                    tiffOffset,
                    segmentEnd,
                    result
                );

                return result;
            }
        }

        offset = segmentEnd;
    }

    return result;
}

function parseTiffExif(
    view,
    tiffOffset,
    endOffset,
    result
) {
    if (
        tiffOffset + 8 >
        endOffset
    ) {
        return;
    }

    const byteOrder =
        view.getUint16(
            tiffOffset,
            false
        );

    const littleEndian =
        byteOrder === 0x4949;

    if (
        !littleEndian &&
        byteOrder !== 0x4d4d
    ) {
        return;
    }

    if (
        view.getUint16(
            tiffOffset + 2,
            littleEndian
        ) !== 42
    ) {
        return;
    }

    function isSafe(
        start,
        length
    ) {
        return (
            start >= tiffOffset &&
            length >= 0 &&
            start + length <= endOffset
        );
    }

    function typeSize(type) {
        const map = {
            1: 1,
            2: 1,
            3: 2,
            4: 4,
            5: 8,
            7: 1,
            9: 4,
            10: 8,
        };

        return map[type] || 1;
    }

    function readValue(
        entryOffset
    ) {
        if (
            !isSafe(
                entryOffset,
                12
            )
        ) {
            return null;
        }

        const type =
            view.getUint16(
                entryOffset + 2,
                littleEndian
            );

        const count =
            view.getUint32(
                entryOffset + 4,
                littleEndian
            );

        const totalBytes =
            typeSize(type) *
            count;

        let valueOffset;

        if (totalBytes <= 4) {
            valueOffset =
                entryOffset + 8;
        } else {
            const relativeOffset =
                view.getUint32(
                    entryOffset + 8,
                    littleEndian
                );

            valueOffset =
                tiffOffset +
                relativeOffset;
        }

        if (
            !isSafe(
                valueOffset,
                totalBytes
            )
        ) {
            return null;
        }

        if (type === 2) {
            let text = "";

            for (
                let index = 0;
                index < count;
                index += 1
            ) {
                const value =
                    view.getUint8(
                        valueOffset +
                        index
                    );

                if (value === 0) {
                    break;
                }

                text +=
                    String.fromCharCode(
                        value
                    );
            }

            return text.trim();
        }

        if (type === 3) {
            const values = [];

            for (
                let index = 0;
                index < count;
                index += 1
            ) {
                values.push(
                    view.getUint16(
                        valueOffset +
                        index * 2,
                        littleEndian
                    )
                );
            }

            return count === 1
                ? values[0]
                : values;
        }

        if (type === 4) {
            const values = [];

            for (
                let index = 0;
                index < count;
                index += 1
            ) {
                values.push(
                    view.getUint32(
                        valueOffset +
                        index * 4,
                        littleEndian
                    )
                );
            }

            return count === 1
                ? values[0]
                : values;
        }

        if (type === 5) {
            const values = [];

            for (
                let index = 0;
                index < count;
                index += 1
            ) {
                const itemOffset =
                    valueOffset +
                    index * 8;

                const numerator =
                    view.getUint32(
                        itemOffset,
                        littleEndian
                    );

                const denominator =
                    view.getUint32(
                        itemOffset + 4,
                        littleEndian
                    );

                values.push(
                    denominator
                        ? numerator /
                        denominator
                        : 0
                );
            }

            return count === 1
                ? values[0]
                : values;
        }

        return null;
    }

    function readIfd(
        relativeOffset
    ) {
        const ifdOffset =
            tiffOffset +
            relativeOffset;

        if (
            !isSafe(ifdOffset, 2)
        ) {
            return new Map();
        }

        const entryCount =
            view.getUint16(
                ifdOffset,
                littleEndian
            );

        const entries =
            new Map();

        for (
            let index = 0;
            index < entryCount;
            index += 1
        ) {
            const entryOffset =
                ifdOffset +
                2 +
                index * 12;

            if (
                !isSafe(
                    entryOffset,
                    12
                )
            ) {
                break;
            }

            const tag =
                view.getUint16(
                    entryOffset,
                    littleEndian
                );

            entries.set(
                tag,
                readValue(
                    entryOffset
                )
            );
        }

        return entries;
    }

    const firstIfdRelative =
        view.getUint32(
            tiffOffset + 4,
            littleEndian
        );

    const mainIfd =
        readIfd(
            firstIfdRelative
        );

    result.make =
        mainIfd.get(0x010f) ||
        null;

    result.model =
        mainIfd.get(0x0110) ||
        null;

    result.orientation =
        mainIfd.get(0x0112) ||
        null;

    result.dateTime =
        mainIfd.get(0x0132) ||
        null;

    const exifPointer =
        mainIfd.get(0x8769);

    if (
        Number.isFinite(
            exifPointer
        )
    ) {
        const exifIfd =
            readIfd(
                exifPointer
            );

        result.dateTimeOriginal =
            exifIfd.get(
                0x9003
            ) || null;
    }

    const gpsPointer =
        mainIfd.get(0x8825);

    if (
        Number.isFinite(
            gpsPointer
        )
    ) {
        result.hasGps = true;

        const gpsIfd =
            readIfd(
                gpsPointer
            );

        const latitudeRef =
            gpsIfd.get(0x0001);

        const latitude =
            gpsIfd.get(0x0002);

        const longitudeRef =
            gpsIfd.get(0x0003);

        const longitude =
            gpsIfd.get(0x0004);

        result.latitude =
            formatGpsCoordinate(
                latitude,
                latitudeRef
            );

        result.longitude =
            formatGpsCoordinate(
                longitude,
                longitudeRef
            );
    }
}

export async function readImageMetadata(
    file
) {
    if (!file) {
        throw new Error(
            "No image file was provided."
        );
    }

    if (
        !SUPPORTED_TYPES.includes(
            file.type
        )
    ) {
        throw new Error(
            "Please use a JPG, PNG, or WebP image."
        );
    }

    const bitmap =
        await createImageBitmap(
            file
        );

    try {
        let exif = {
            hasExif: false,
            hasGps: false,

            make: null,
            model: null,

            dateTime: null,
            dateTimeOriginal: null,

            orientation: null,

            latitude: null,
            longitude: null,
        };

        if (
            file.type ===
            "image/jpeg"
        ) {
            const buffer =
                await file.arrayBuffer();

            exif =
                parseJpegExif(
                    buffer
                );
        }

        return {
            fileName:
                file.name ||
                "image",

            mimeType:
                file.type,

            size:
                file.size,

            width:
                bitmap.width,

            height:
                bitmap.height,

            lastModified:
                file.lastModified
                    ? new Date(
                        file.lastModified
                    ).toLocaleString()
                    : null,

            detailedExifSupported:
                file.type ===
                "image/jpeg",

            ...exif,
        };
    } finally {
        bitmap.close();
    }
}