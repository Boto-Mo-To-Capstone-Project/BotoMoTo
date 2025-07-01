import LogoutButton from "@/components/LogoutButton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <aside className="w-64 bg-white shadow-xl p-4">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">BotoMoTo</h2>
          <nav className="space-y-2">
            <a href="/dashboard/voters" className="block text-gray-700 hover:text-blue-500">Voters</a>
            <a href="/dashboard/candidates" className="block text-gray-700 hover:text-blue-500">Candidates</a>
            <a href="/dashboard/elections" className="block text-gray-700 hover:text-blue-500">Elections</a>
            <a href="/dashboard/analytics" className="block text-gray-700 hover:text-blue-500">Analytics</a>
            <a href="/dashboard/settings" className="block text-gray-700 hover:text-blue-500">Settings</a>
          </nav>
          <div className="mt-6">
            <LogoutButton />
          </div>
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    );
  }
  