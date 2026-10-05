import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ImageIcon, Video, ArrowRight } from "lucide-react";
import MonthlyUsage from "@/components/dashboard/MonthlyUsage";

export default async function DashboardPage() {
    const { userId } = await auth();

    const [mediaCount, imageCount, videoCount, recentMedia] = await Promise.all([
        prisma.media.count({
            where: {
                ownerId: userId,
            },
        }),

        prisma.media.count({
            where: {
                ownerId: userId,
                type: "IMAGE",
            },
        }),

        prisma.media.count({
            where: {
                ownerId: userId,
                type: "VIDEO",
            },
        }),

        prisma.media.findMany({
            where: {
                ownerId: userId,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 5,
        }),
    ]);
    return (
        <div>
            <div>
                <h1 className="text-2xl font-bold text-foreground">
                    Dashboard
                </h1>

                <p className="mt-2 text-muted">
                    Manage your images, videos, and media activity from one workspace.
                </p>
            </div>

            <section className="mt-10">
                <div className="mb-5">
                    <h2 className="text-lg font-semibold text-foreground">
                        Quick Actions
                    </h2>

                    <p className="mt-1 text-sm text-muted">
                        Start a new media task.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Link
                        href="/studio/image"
                        className="group rounded-2xl border border-border bg-surface p-6 transition hover:border-primary/40 hover:shadow-sm"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <ImageIcon size={20} />
                        </div>

                        <h3 className="mt-5 text-lg font-semibold text-foreground">
                            Image Studio
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-muted">
                            Upload images, create social-ready sizes, crop intelligently,
                            and optimize delivery.
                        </p>

                        <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary">
                            Open Image Studio
                            <ArrowRight
                                size={16}
                                className="transition group-hover:translate-x-1"
                            />
                        </div>
                    </Link>

                    <Link
                        href="/studio/video"
                        className="group rounded-2xl border border-border bg-surface p-6 transition hover:border-secondary/40 hover:shadow-sm"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                            <Video size={20} />
                        </div>

                        <h3 className="mt-5 text-lg font-semibold text-foreground">
                            Video Studio
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-muted">
                            Upload videos, optimize file size, generate previews, and manage
                            processed media.
                        </p>

                        <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-secondary">
                            Open Video Studio
                            <ArrowRight
                                size={16}
                                className="transition group-hover:translate-x-1"
                            />
                        </div>
                    </Link>
                </div>
            </section>

            <section className="mt-10">
                <div className="mb-5">
                    <h2 className="text-lg font-semibold text-foreground">
                        Usage Summary
                    </h2>

                    <p className="mt-1 text-sm text-muted">
                        Your current media activity.
                    </p>
                </div>

                <div className="mt-4">
                    <MonthlyUsage />
                </div>


                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-border bg-surface p-5">
                        <p className="text-sm text-muted">
                            Images processed
                        </p>

                        <p className="mt-3 text-3xl font-bold text-foreground">
                            {imageCount}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-surface p-5">
                        <p className="text-sm text-muted">
                            Videos processed
                        </p>

                        <p className="mt-3 text-3xl font-bold text-foreground">
                            {videoCount}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-surface p-5">
                        <p className="text-sm text-muted">
                            Media files
                        </p>

                        <p className="mt-3 text-3xl font-bold text-foreground">
                            {mediaCount}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-surface p-5">
                        <p className="text-sm text-muted">
                            Monthly usage
                        </p>

                        <p className="mt-3 text-3xl font-bold text-foreground">
                            0%
                        </p>
                    </div>
                </div>
            </section>

            <section className="mt-10">
                <div className="mb-5">
                    <h2 className="text-lg font-semibold text-foreground">
                        Recent Media
                    </h2>

                    <p className="mt-1 text-sm text-muted">
                        Your latest uploaded and processed files will appear here.
                    </p>
                </div>

                {recentMedia.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <ImageIcon size={22} />
                        </div>

                        <h3 className="mt-5 text-lg font-semibold text-foreground">
                            No media yet
                        </h3>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                            Upload an image or video to start building your media library.
                        </p>

                        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                            <Link
                                href="/studio/image"
                                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
                            >
                                Upload Image
                            </Link>

                            <Link
                                href="/studio/video"
                                className="rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-slate-50"
                            >
                                Upload Video
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                        {recentMedia.map((media) => (
                            <a
                                key={media.id}
                                href={media.secureUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between border-b border-border px-5 py-4 transition hover:bg-background last:border-b-0"
                            >
                                <div>
                                    <p className="font-medium text-foreground">
                                        {media.originalFilename}
                                    </p>

                                    <p className="mt-1 text-sm text-muted">
                                        {media.type} · {media.status}
                                    </p>
                                </div>

                                <span className="text-xs font-semibold text-muted">
                                    {media.format || "—"}
                                </span>
                            </a>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}