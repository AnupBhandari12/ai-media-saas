import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import AltTextGeneratorClient from "@/components/ai/AltTextGeneratorClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Alt Text Generator — Local Mock Preview",
  description: "Prepare accessibility alt text from your own description, with a local-only image preview. No AI image analysis.",
};

export default async function AltTextGeneratorPage() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) redirect("/sign-in");
  return <AltTextGeneratorClient />;
}
