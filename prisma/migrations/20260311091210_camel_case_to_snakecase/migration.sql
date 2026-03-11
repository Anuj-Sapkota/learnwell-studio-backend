/*
  Warnings:

  - You are about to drop the column `created_at` on the `DeviceSession` table. All the data in the column will be lost.
  - You are about to drop the column `device_type` on the `DeviceSession` table. All the data in the column will be lost.
  - You are about to drop the column `ip_address` on the `DeviceSession` table. All the data in the column will be lost.
  - You are about to drop the column `last_active` on the `DeviceSession` table. All the data in the column will be lost.
  - You are about to drop the column `user_agent` on the `DeviceSession` table. All the data in the column will be lost.
  - Added the required column `expires_at` to the `DeviceSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ipAddress` to the `DeviceSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userAgent` to the `DeviceSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DeviceSession" DROP COLUMN "created_at",
DROP COLUMN "device_type",
DROP COLUMN "ip_address",
DROP COLUMN "last_active",
DROP COLUMN "user_agent",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deviceType" TEXT,
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ipAddress" VARCHAR(45) NOT NULL,
ADD COLUMN     "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userAgent" TEXT NOT NULL;
