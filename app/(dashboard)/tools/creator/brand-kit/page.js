import { auth } from "@clerk/nextjs/server";

import BrandKitWorkspace from "@/components/tools/creator/BrandKitWorkspace";

export default async function BrandKitPage() {
    const {
        userId,
    } = await auth();

    return (
        <BrandKitWorkspace
            uploadFolder={`ai-media/${userId}/brand-kit`}
        />
    );
}