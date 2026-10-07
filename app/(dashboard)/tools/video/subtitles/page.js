import { auth } from "@clerk/nextjs/server";

import AutoSubtitlesWorkspace from "@/components/tools/video/AutoSubtitlesWorkspace";

import { getLatestUserVideo } from "@/lib/video/getLatestUserVideo";

export default async function AutoSubtitlesPage() {
    const {
        userId,
    } = await auth();

    const initialVideo =
        await getLatestUserVideo(
            userId
        );

    return (
        <AutoSubtitlesWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
            initialVideo={
                initialVideo
            }
        />
    );
}