import { auth } from "@clerk/nextjs/server";

import cloudinary from "@/lib/cloudinary";
import prisma from "@/lib/prisma";

import { brandKitSchema } from "@/lib/validation/brandKit";

const MAX_LOGO_SIZE =
    5_000_000;

async function verifyLogo(
    userId,
    publicId
) {
    if (!publicId) {
        return null;
    }

    const expectedPrefix =
        `ai-media/${userId}/brand-kit/`;

    if (
        !publicId.startsWith(
            expectedPrefix
        )
    ) {
        throw new Error(
            "Invalid brand logo ownership."
        );
    }

    let resource;

    try {
        resource =
            await cloudinary.api.resource(
                publicId,
                {
                    resource_type:
                        "image",
                }
            );
    } catch {
        throw new Error(
            "Brand logo could not be verified."
        );
    }

    if (
        !resource ||
        resource.public_id !==
        publicId
    ) {
        throw new Error(
            "Brand logo could not be verified."
        );
    }

    if (
        resource.bytes >
        MAX_LOGO_SIZE
    ) {
        throw new Error(
            "Brand logo must be 5 MB or smaller."
        );
    }

    const allowedFormats = [
        "jpg",
        "jpeg",
        "png",
        "webp",
    ];

    if (
        !allowedFormats.includes(
            resource.format
        )
    ) {
        throw new Error(
            "Brand logo must be JPG, PNG, or WebP."
        );
    }

    return {
        publicId:
            resource.public_id,

        secureUrl:
            resource.secure_url,

        format:
            resource.format || null,

        width:
            resource.width || null,

        height:
            resource.height || null,
    };
}

export async function GET() {
    const {
        isAuthenticated,
        userId,
    } = await auth();

    if (
        !isAuthenticated ||
        !userId
    ) {
        return Response.json(
            {
                error:
                    "Unauthorized",
            },
            {
                status: 401,
            }
        );
    }

    const brandKit =
        await prisma.brandKit.findUnique(
            {
                where: {
                    ownerId:
                        userId,
                },
            }
        );

    return Response.json({
        brandKit,
    });
}

export async function PUT(
    request
) {
    const {
        isAuthenticated,
        userId,
    } = await auth();

    if (
        !isAuthenticated ||
        !userId
    ) {
        return Response.json(
            {
                error:
                    "Unauthorized",
            },
            {
                status: 401,
            }
        );
    }

    let body;

    try {
        body =
            await request.json();
    } catch {
        return Response.json(
            {
                error:
                    "Invalid JSON body.",
            },
            {
                status: 400,
            }
        );
    }

    const validation =
        brandKitSchema.safeParse(
            body
        );

    if (
        !validation.success
    ) {
        return Response.json(
            {
                error:
                    "Invalid brand kit settings.",
            },
            {
                status: 400,
            }
        );
    }

    const data =
        validation.data;

    let logo = null;

    try {
        logo =
            await verifyLogo(
                userId,
                data.logoPublicId
            );
    } catch (error) {
        return Response.json(
            {
                error:
                    error instanceof
                        Error
                        ? error.message
                        : "Brand logo verification failed.",
            },
            {
                status: 400,
            }
        );
    }

    const existing =
        await prisma.brandKit.findUnique(
            {
                where: {
                    ownerId:
                        userId,
                },
            }
        );

    const payload = {
        brandName:
            data.brandName ||
            null,

        primaryColor:
            data.primaryColor,

        secondaryColor:
            data.secondaryColor,

        logoPublicId:
            logo?.publicId ||
            null,

        logoSecureUrl:
            logo?.secureUrl ||
            null,

        logoFormat:
            logo?.format ||
            null,

        logoWidth:
            logo?.width ||
            null,

        logoHeight:
            logo?.height ||
            null,

        defaultWatermarkType:
            data.defaultWatermarkType,

        defaultWatermarkText:
            data.defaultWatermarkText ||
            null,

        defaultWatermarkOpacity:
            data.defaultWatermarkOpacity,

        defaultWatermarkSize:
            data.defaultWatermarkSize,

        defaultWatermarkPosition:
            data.defaultWatermarkPosition,
    };

    const brandKit =
        await prisma.brandKit.upsert(
            {
                where: {
                    ownerId:
                        userId,
                },

                create: {
                    ownerId:
                        userId,

                    ...payload,
                },

                update:
                    payload,
            }
        );

    if (
        existing
            ?.logoPublicId &&
        existing.logoPublicId !==
        brandKit.logoPublicId
    ) {
        try {
            await cloudinary.uploader.destroy(
                existing.logoPublicId,
                {
                    resource_type:
                        "image",

                    invalidate:
                        true,
                }
            );
        } catch (error) {
            console.error(
                "Old brand logo cleanup failed:",
                error
            );
        }
    }

    return Response.json({
        brandKit,
    });
}