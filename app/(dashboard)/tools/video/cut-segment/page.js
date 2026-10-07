import { auth } from "@clerk/nextjs/server";

import CutSegmentWorkspace from "@/components/tools/video/CutSegmentWorkspace";

import { getLatestUserVideo } from "@/lib/video/getLatestUserVideo";

export default async function CutSegmentPage() {
    const {
        userId,
    } = await auth();

    const initialVideo =
        await getLatestUserVideo(
            userId
        );

    return (
        <CutSegmentWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
            initialVideo={
                initialVideo
            }
        />
    );
}