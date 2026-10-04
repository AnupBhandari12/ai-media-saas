import Skeleton from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-3 h-5 w-80 max-w-full" />

      <div className="mt-10">
        <Skeleton className="h-6 w-32" />

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </div>

      <div className="mt-10">
        <Skeleton className="h-6 w-36" />

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>

      <Skeleton className="mt-10 h-64 rounded-2xl" />
    </div>
  );
}