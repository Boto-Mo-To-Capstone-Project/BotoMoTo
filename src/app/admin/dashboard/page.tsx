// Folder: your-project/app/admin/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getUserFromCookie } from '@/lib/auth';
import ElectionList from '@/components/admin/ElectionList';

export default async function AdminDashboardPage() {
  const user = await getUserFromCookie();

  if (!user || user.role !== 'admin') {
    redirect('/admin/login');
  }

  // display the user for dbgging
    console.log('User:', user);
  return (
    <main className="min-h-screen flex justify-center items-center px-2 bg-[var(--background)] text-[var(--foreground)] pt-40 pb-40">
      <div className="w-full max-w-[380px] mx-auto text-center space-y-6 pt-10 pb-10 px-4">
        <ElectionList orgId={user.org_id} />
      </div>
    </main>
  );
}
