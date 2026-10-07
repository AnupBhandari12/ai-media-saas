import { auth } from "@clerk/nextjs/server";

import MergeVideosWorkspace from "@/components/tools/video/MergeVideosWorkspace";

export default async function MergeVideosPage() {
    const {
        userId,
    } = await auth();

    return (
        <MergeVideosWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
        />
    );
}