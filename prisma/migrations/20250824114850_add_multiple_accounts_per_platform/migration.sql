/*
  Warnings:

  - You are about to drop the column `engagement` on the `post_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `fetchedAt` on the `post_analytics` table. All the data in the column will be lost.
  - You are about to drop the column `views` on the `post_analytics` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `post_analytics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platform` to the `posts` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_post_analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "post_analytics_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_post_analytics" ("comments", "createdAt", "id", "likes", "platform", "postId", "shares") SELECT "comments", "createdAt", "id", "likes", "platform", "postId", "shares" FROM "post_analytics";
DROP TABLE "post_analytics";
ALTER TABLE "new_post_analytics" RENAME TO "post_analytics";
CREATE UNIQUE INDEX "post_analytics_postId_platform_key" ON "post_analytics"("postId", "platform");
CREATE TABLE "new_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "hashtags" TEXT NOT NULL,
    "imageUrl" TEXT,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scheduledAt" DATETIME,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "teamId" TEXT,
    "assigneeId" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "images" TEXT,
    CONSTRAINT "posts_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "posts_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_posts" ("approvalStatus", "approvedAt", "approvedBy", "assigneeId", "content", "createdAt", "hashtags", "id", "imageUrl", "images", "publishedAt", "scheduledAt", "status", "teamId", "updatedAt", "userId") SELECT "approvalStatus", "approvedAt", "approvedBy", "assigneeId", "content", "createdAt", "hashtags", "id", "imageUrl", "images", "publishedAt", "scheduledAt", "status", "teamId", "updatedAt", "userId" FROM "posts";
DROP TABLE "posts";
ALTER TABLE "new_posts" RENAME TO "posts";
CREATE TABLE "new_social_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "displayName" TEXT,
    "username" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "accountType" TEXT NOT NULL DEFAULT 'PERSONAL',
    "permissions" JSONB DEFAULT [],
    "lastSync" DATETIME,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "social_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_social_accounts" ("accessToken", "accountId", "accountName", "createdAt", "expiresAt", "id", "isActive", "platform", "refreshToken", "updatedAt", "userId") SELECT "accessToken", "accountId", "accountName", "createdAt", "expiresAt", "id", "isActive", "platform", "refreshToken", "updatedAt", "userId" FROM "social_accounts";
DROP TABLE "social_accounts";
ALTER TABLE "new_social_accounts" RENAME TO "social_accounts";
CREATE UNIQUE INDEX "social_accounts_userId_platform_accountId_key" ON "social_accounts"("userId", "platform", "accountId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
