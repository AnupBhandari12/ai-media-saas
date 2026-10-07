import { auth } from "@clerk/nextjs/server";

import FrameExtractorWorkspace from "@/components/tools/video/FrameExtractorWorkspace";

import { getLatestUserVideo } from "@/lib/video/getLatestUserVideo";

export default async function FrameExtractorPage() {
    const {
        userId,
    } = await auth();

    const initialVideo =
        await getLatestUserVideo(
            userId
        );

    return (
        <FrameExtractorWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
            initialVideo={
                initialVideo
            }
        />
    );
}