import { getUserFromCookie } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await getUserFromCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(user);
}
