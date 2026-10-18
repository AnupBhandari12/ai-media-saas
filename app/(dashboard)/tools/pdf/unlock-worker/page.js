import { notFound } from "next/navigation";
import LocalPdfDevWorkspace from "@/components/tools/pdf/LocalPdfDevWorkspace";

export const dynamic = "force-dynamic";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <LocalPdfDevWorkspace toolId="PDF-16" />;
}
