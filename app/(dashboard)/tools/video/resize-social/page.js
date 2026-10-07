import { auth } from "@clerk/nextjs/server";

import SocialVideoWorkspace from "@/components/tools/video/SocialVideoWorkspace";

import { getLatestUserVideo } from "@/lib/video/getLatestUserVideo";

export default async function SocialVideoPage() {
    const {
        userId,
    } = await auth();

    const initialVideo =
        await getLatestUserVideo(
            userId
        );

    return (
        <SocialVideoWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
            initialVideo={
                initialVideo
            }
        />
    );
}