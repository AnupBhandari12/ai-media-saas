import { auth } from "@clerk/nextjs/server";

import RotateVideoWorkspace from "@/components/tools/video/RotateVideoWorkspace";

import { getLatestUserVideo } from "@/lib/video/getLatestUserVideo";

export default async function RotateVideoPage() {
    const {
        userId,
    } = await auth();

    const initialVideo =
        await getLatestUserVideo(
            userId
        );

    return (
        <RotateVideoWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
            initialVideo={
                initialVideo
            }
        />
    );
}