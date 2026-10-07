import { auth } from "@clerk/nextjs/server";

import VideoGifWorkspace from "@/components/tools/video/VideoGifWorkspace";

import { getLatestUserVideo } from "@/lib/video/getLatestUserVideo";

export default async function VideoGifPage() {
    const {
        userId,
    } = await auth();

    const initialVideo =
        await getLatestUserVideo(
            userId
        );

    return (
        <VideoGifWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
            initialVideo={
                initialVideo
            }
        />
    );
}