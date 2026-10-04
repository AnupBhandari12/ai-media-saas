import DashboardSidebar from "@/components/layout/DashboardSidebar";
import DashboardTopbar from "@/components/layout/DashboardTopbar";

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <DashboardSidebar />

      <div className="min-w-0 flex-1">
        <DashboardTopbar />

        <main className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}