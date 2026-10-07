import { auth } from "@clerk/nextjs/server";

import ExtractAudioWorkspace from "@/components/tools/video/ExtractAudioWorkspace";

import { getLatestUserVideo } from "@/lib/video/getLatestUserVideo";

export default async function ExtractAudioPage() {
    const {
        userId,
    } = await auth();

    const initialVideo =
        await getLatestUserVideo(
            userId
        );

    return (
        <ExtractAudioWorkspace
            uploadFolder={`ai-media/${userId}/videos`}
            initialVideo={
                initialVideo
            }
        />
    );
}