import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client/extension";

export const CustomPrismaAdapter = (db: PrismaClient) => {
  const originalAdapter = PrismaAdapter(db);

  return {
    ...originalAdapter,
    async getSessionAndUser(sessionToken: string) {
      const session = await db.session.findUnique({
        where: { sessionToken },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              // Add more if needed, but exclude password
                organization: {
                    select: {
                    id: true,
                    name: true,
                    email: true,
                    status: true,
                    photoUrl: true,
                    letterUrl: true,
                    },
                },
            },
          },
        },
      });

      if (!session) return null;
      const { user, ...sessionData } = session;
      return { user, session: sessionData };
    },
  };
};
