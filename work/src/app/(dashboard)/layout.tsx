import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#060d2b]" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#3b5eee]/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#1e3fdb]/[0.05] rounded-full blur-[100px]" />
      </div>
      <Sidebar />
      <main className="lg:pl-[260px]">
        <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
