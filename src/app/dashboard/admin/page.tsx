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
  return <ElectionList orgId={user.org_id} />;
}
