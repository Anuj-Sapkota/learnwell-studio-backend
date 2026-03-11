/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `DeviceSession` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `token` to the `DeviceSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DeviceSession" ADD COLUMN     "token" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DeviceSession_token_key" ON "DeviceSession"("token");
