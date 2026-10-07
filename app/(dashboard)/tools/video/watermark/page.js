import { auth } from "@clerk/nextjs/server";

import VideoWatermarkWorkspace from "@/components/tools/video/VideoWatermarkWorkspace";

import { getLatestUserVideo } from "@/lib/video/getLatestUserVideo";

export default async function VideoWatermarkPage() {
    const {
        userId,
    } = await auth();

    const initialVideo =
        await getLatestUserVideo(
            userId
        );

    return (
        <VideoWatermarkWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
            initialVideo={
                initialVideo
            }
        />
    );
}