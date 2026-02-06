import { apiResponse } from '@/lib/apiResponse';
import { ROLES } from '@/lib/constants';

interface OwnershipResult {
  allowed: boolean;
  response: Response; // always a Response (never undefined)
}

export function checkOwnership(user: any, resourceAdminId: string): OwnershipResult {
  if (user.role === ROLES.ADMIN && user.id !== resourceAdminId) {
    return {
      allowed: false,
      response: apiResponse({
        success: false,
        message: 'You do not own this resource',
        error: 'Forbidden',
        status: 403,
      }),
    };
  }

  // ✅ still return a response when ownership is valid
  return {
    allowed: true,
    response: apiResponse({
      success: true,
      message: 'Ownership verified',
      status: 200,
    }),
  };
}
