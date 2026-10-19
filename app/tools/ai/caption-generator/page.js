import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import CaptionGeneratorClient from "@/components/ai/CaptionGeneratorClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Caption Generator — Local Preview",
  description: "Write and edit a safe local mock caption preview. No paid AI calls.",
};

export default async function CaptionGeneratorPage() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) redirect("/sign-in");

  return <CaptionGeneratorClient />;
}
