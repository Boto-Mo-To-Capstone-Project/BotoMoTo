import { cookies } from 'next/headers';
import { verifyToken } from './jwt';

export async function getUserFromCookie() {
  // Get the cookies from the request
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  try {
    return verifyToken(token) as {
        org_id: string; email: string; role: string 
};
  } catch {
    return null;
  }
}
