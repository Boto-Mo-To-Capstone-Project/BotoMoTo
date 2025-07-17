/*
  Warnings:

  - You are about to drop the `OrgContactDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `description` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `frequency` on the `Organization` table. All the data in the column will be lost.
  - Added the required column `email` to the `Organization` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OrgContactDetails";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Organization" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "adminId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "membersCount" INTEGER NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "photoUrl" TEXT,
    "letterUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Organization_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Organization" ("adminId", "createdAt", "deletedAt", "id", "isDeleted", "letterUrl", "membersCount", "name", "photoUrl", "status", "updatedAt") SELECT "adminId", "createdAt", "deletedAt", "id", "isDeleted", "letterUrl", "membersCount", "name", "photoUrl", "status", "updatedAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_adminId_key" ON "Organization"("adminId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
