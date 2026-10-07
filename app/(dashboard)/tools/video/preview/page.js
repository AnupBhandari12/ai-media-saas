import { auth } from "@clerk/nextjs/server";

import SmartPreviewWorkspace from "@/components/tools/video/SmartPreviewWorkspace";

import { getLatestUserVideo } from "@/lib/video/getLatestUserVideo";

export default async function SmartPreviewPage() {
    const {
        userId,
    } = await auth();

    const initialVideo =
        await getLatestUserVideo(
            userId
        );

    return (
        <SmartPreviewWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
            initialVideo={
                initialVideo
            }
        />
    );
}