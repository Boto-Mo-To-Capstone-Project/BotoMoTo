import { PrismaClient } from "../src/generated/prisma/index.js";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const superadminEmail =
  process.env.SUPERADMIN_EMAIL || "superadmin@botomoto.com";
const superadminPassword = process.env.SUPERADMIN_PASSWORD || "superadmin123";

if (!process.env.SUPERADMIN_EMAIL || !process.env.SUPERADMIN_PASSWORD) {
  console.warn(
    "[WARN] Using default superadmin email/password. Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in your .env for production."
  );
}

async function createSuperAdmin() {
  try {
    // Check if SuperAdmin already exists
    const existingSuperAdmin = await prisma.user.findFirst({
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

    const superAdmin = await prisma.user.create({
      data: {
        email: superadminEmail,
        name: "Super Admin",
        password: hashedPassword,
        role: "SUPER_ADMIN",
        isActive: true,
        isApproved: true, // SuperAdmin is auto-approved
      },
    });

    console.log("SuperAdmin created successfully!");
    console.log("Email:", superAdmin.email);
    console.log("Password:", superadminPassword);
    console.log("Role:", superAdmin.role);
  } catch (error) {
    console.error("Error creating SuperAdmin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
