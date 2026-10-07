import { auth } from "@clerk/nextjs/server";

import CropVideoWorkspace from "@/components/tools/video/CropVideoWorkspace";

import { getLatestUserVideo } from "@/lib/video/getLatestUserVideo";

export default async function CropVideoPage() {
    const {
        userId,
    } = await auth();

    const initialVideo =
        await getLatestUserVideo(
            userId
        );

    return (
        <CropVideoWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
            initialVideo={
                initialVideo
            }
        />
    );
}