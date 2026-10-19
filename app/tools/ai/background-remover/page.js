import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import BackgroundRemoverClient from "@/components/ai/BackgroundRemoverClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Background Remover — Preparation Preview",
  description: "Prepare an image for future AI background removal. Browser-only original preview, no image upload or processing.",
};

export default async function BackgroundRemoverPage() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) redirect("/sign-in");
  return <BackgroundRemoverClient />;
}
