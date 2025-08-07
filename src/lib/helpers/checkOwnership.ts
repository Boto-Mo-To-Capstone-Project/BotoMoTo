import { apiResponse } from '@/lib/apiResponse';
import { ROLES } from '@/lib/constants';

//resourceAdminId is the ID of the admin who owns the resource
//user is the currently authenticated user
//This function checks if the user has ownership of the resource
export function checkOwnership(user: any, resourceAdminId: string) {
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

  return { allowed: true };
}
