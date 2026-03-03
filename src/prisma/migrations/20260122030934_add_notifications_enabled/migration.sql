-- CreateEnum
CREATE TYPE "NotificationMode" AS ENUM ('MANUAL', 'AUTO');

-- AlterTable
ALTER TABLE "system_config" ADD COLUMN     "notificationMode" "NotificationMode" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
