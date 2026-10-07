import { auth } from "@clerk/nextjs/server";

import TrimVideoWorkspace from "@/components/tools/video/TrimVideoWorkspace";

export default async function TrimVideoPage() {
    const {
        userId,
    } = await auth();

    return (
        <TrimVideoWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
        />
    );
}