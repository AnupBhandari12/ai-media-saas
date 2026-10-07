import { auth } from "@clerk/nextjs/server";

import MuteVideoWorkspace from "@/components/tools/video/MuteVideoWorkspace";

import { getLatestUserVideo } from "@/lib/video/getLatestUserVideo";

export default async function MuteVideoPage() {
    const {
        userId,
    } = await auth();

    const initialVideo =
        await getLatestUserVideo(
            userId
        );

    return (
        <MuteVideoWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
            initialVideo={
                initialVideo
            }
        />
    );
}