import { auth } from '@/lib/auth';
import { apiResponse } from '@/lib/apiResponse';
import { ROLES } from '@/lib/constants';

type Role = typeof ROLES[keyof typeof ROLES];

export async function requireAuth(allowedRoles: Role[] = []) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return {
      authorized: false,
      response: apiResponse({
        success: false,
        message: 'You must be logged in',
        error: 'Unauthorized',
        status: 401,
      }),
    };
  }

  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return {
      authorized: false,
      response: apiResponse({
        success: false,
        message: 'You are not authorized to access this resource',
        error: 'Forbidden',
        status: 403,
      }),
    };
  }

  return { authorized: true, user };
}
