import { auth } from "@clerk/nextjs/server";

import CompressVideoWorkspace from "@/components/tools/video/CompressVideoWorkspace";

export default async function CompressVideoPage() {
    const {
        userId,
    } = await auth();

    return (
        <CompressVideoWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
        />
    );
}