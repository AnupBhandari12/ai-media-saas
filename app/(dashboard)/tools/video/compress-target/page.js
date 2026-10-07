import { auth } from "@clerk/nextjs/server";

import TargetCompressVideoWorkspace from "@/components/tools/video/TargetCompressVideoWorkspace";

import { getLatestUserVideo } from "@/lib/video/getLatestUserVideo";

export default async function TargetCompressVideoPage() {
    const {
        userId,
    } = await auth();

    const initialVideo =
        await getLatestUserVideo(
            userId
        );

    return (
        <TargetCompressVideoWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
            initialVideo={
                initialVideo
            }
        />
    );
}