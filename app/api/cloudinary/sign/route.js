import { auth } from "@clerk/nextjs/server";

import cloudinary from "@/lib/cloudinary";

export async function POST(request) {
  const { isAuthenticated } = await auth();

  if (!isAuthenticated) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { paramsToSign } = body;

  if (!paramsToSign) {
    return Response.json(
      { error: "Missing upload parameters." },
      { status: 400 }
    );
  }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  return Response.json({ signature });
}