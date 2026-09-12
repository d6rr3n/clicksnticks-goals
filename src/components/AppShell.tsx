import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[214px_1fr]">
      <Sidebar />
      <main className="flex min-w-0 flex-col gap-4 px-4 py-5 sm:px-6">
        {children}
      </main>
    </div>
  );
}
