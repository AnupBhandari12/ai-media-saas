import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import BackgroundRemoverClient from "@/components/ai/BackgroundRemoverClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Background Remover — Free Editor + Controlled AI Beta",
  description: "Edit simple backgrounds in your browser or opt in to a gated, vendor-credit-limited AI cutout workflow.",
};

export default async function BackgroundRemoverPage() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) redirect("/sign-in");
  return <BackgroundRemoverClient />;
}
