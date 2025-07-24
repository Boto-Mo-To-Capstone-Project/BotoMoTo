import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const db = new PrismaClient();
const superadminEmail = process.env.SUPERADMIN_EMAIL || "superadmin@botomoto.com";
const superadminPassword = process.env.SUPERADMIN_PASSWORD || "superadmin123";

// Warn if default credentials are used
if (!process.env.SUPERADMIN_EMAIL || !process.env.SUPERADMIN_PASSWORD) {
  console.warn(
    "[WARN] Using default superadmin email/password. Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in your .env for production."
  );
}

async function createSuperAdmin() {
  try {
    // Check if SuperAdmin already exists
    const existingSuperAdmin = await db.user.findFirst({
      where: {
        role: "SUPER_ADMIN",
        email: superadminEmail,
      },
    });

    if (existingSuperAdmin) {
      console.log("SuperAdmin already exists:", existingSuperAdmin.email);
      return;
    }

    // Create SuperAdmin user
    const hashedPassword = await bcrypt.hash(superadminPassword, 12);

    const superAdmin = await db.user.create({
      data: {
        email: superadminEmail,
        name: "Super Admin",
        password: hashedPassword,
        role: "SUPER_ADMIN",
      },
    });

    console.log("SuperAdmin created successfully!");
    console.log("Email:", superAdmin.email);
    console.log("Password:", superadminPassword);
    console.log("Role:", superAdmin.role);
  } catch (error) {
    console.error("Error creating SuperAdmin:", error);
  } finally {
    await db.$disconnect();
  }
}

createSuperAdmin();