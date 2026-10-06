import { auth } from "@clerk/nextjs/server";

import cloudinary from "@/lib/cloudinary";
import prisma from "@/lib/prisma";

import {
  FREE_BETA_LIMITS,
  getCurrentMonthStart,
} from "@/lib/limits";

export async function POST(request) {
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

  const {
    paramsToSign,
  } = body;

  if (!paramsToSign) {
    return Response.json(
      {
        error:
          "Missing upload parameters.",
      },
      {
        status: 400,
      }
    );
  }

  const imageFolder =
    `ai-media/${userId}/images`;

  const videoFolder =
    `ai-media/${userId}/videos`;

  const brandFolder =
    `ai-media/${userId}/brand-kit`;

  const allowedFolders = [
    imageFolder,
    videoFolder,
    brandFolder,
  ];

  if (
    !paramsToSign.folder ||
    !allowedFolders.includes(
      paramsToSign.folder
    )
  ) {
    return Response.json(
      {
        error:
          "Invalid upload folder.",
      },
      {
        status: 400,
      }
    );
  }

  const blockedParameters = [
    "public_id",
    "overwrite",
    "upload_preset",
    "eager",
    "transformation",
    "type",
  ];

  const hasBlockedParameter =
    blockedParameters.some(
      (parameter) =>
        paramsToSign[
        parameter
        ] !== undefined
    );

  if (
    hasBlockedParameter
  ) {
    return Response.json(
      {
        error:
          "Unsupported upload parameters.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    paramsToSign.folder !==
    brandFolder
  ) {
    const mediaType =
      paramsToSign.folder ===
        imageFolder
        ? "IMAGE"
        : "VIDEO";

    const monthlyLimit =
      mediaType === "IMAGE"
        ? FREE_BETA_LIMITS.imagesPerMonth
        : FREE_BETA_LIMITS.videosPerMonth;

    const usedThisMonth =
      await prisma.media.count({
        where: {
          ownerId:
            userId,

          type:
            mediaType,

          createdAt: {
            gte:
              getCurrentMonthStart(),
          },
        },
      });

    if (
      usedThisMonth >=
      monthlyLimit
    ) {
      return Response.json(
        {
          error:
            mediaType ===
              "IMAGE"
              ? "Monthly image limit reached."
              : "Monthly video limit reached.",
        },
        {
          status: 429,
        }
      );
    }
  }

  const signature =
    cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env
        .CLOUDINARY_API_SECRET
    );

  return Response.json({
    signature,
  });
}