'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      console.log('Logout API response:', data);
      console.log('Redirecting to /auth/login');
      router.push('/auth/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
    >
      Logout
    </button>
  );
}
