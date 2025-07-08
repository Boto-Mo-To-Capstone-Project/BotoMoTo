import { getUserFromCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default async function SuperadminDashboard() {
  const user = await getUserFromCookie();

  if (!user || user.role !== 'superadmin') {
    redirect('/login');
  }

  const { data: organizations, error } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      admins (id, email),
      elections (id, title, isActive)
    `);

  if (error) {
    return <div className="p-4 text-red-500">Error loading organizations</div>;
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Superadmin Dashboard</h1>
      {organizations?.map((org) => (
        <div key={org.id} className="mb-4 border p-4 rounded shadow">
          <h2 className="text-xl font-semibold">{org.name}</h2>

          <p className="mt-2">
            <strong>Admins:</strong>{' '}
            {org.admins?.length ? org.admins.map((a) => a.email).join(', ') : 'None'}
          </p>

          <p>
            <strong>Active Election:</strong>{' '}
            {org.elections?.some((e) => e.isActive) ? '✅ Yes' : '❌ No'}
          </p>
        </div>
      ))}
    </main>
  );
}
