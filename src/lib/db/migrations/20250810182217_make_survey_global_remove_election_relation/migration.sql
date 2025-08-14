/*
  Warnings:

  - You are about to drop the column `electionId` on the `SurveyForm` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SurveyForm" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "formSchema" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_SurveyForm" ("createdAt", "deletedAt", "description", "formSchema", "id", "isActive", "isDeleted", "title", "updatedAt") SELECT "createdAt", "deletedAt", "description", "formSchema", "id", "isActive", "isDeleted", "title", "updatedAt" FROM "SurveyForm";
DROP TABLE "SurveyForm";
ALTER TABLE "new_SurveyForm" RENAME TO "SurveyForm";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
