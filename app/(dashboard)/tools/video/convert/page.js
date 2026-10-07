import { auth } from "@clerk/nextjs/server";

import ConvertVideoWorkspace from "@/components/tools/video/ConvertVideoWorkspace";

export default async function ConvertVideoPage() {
    const {
        userId,
    } = await auth();

    return (
        <ConvertVideoWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
        />
    );
}