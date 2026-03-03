-- CreateTable
CREATE TABLE "daily_closing_logs" (
    "id" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedBy" TEXT NOT NULL,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "clientsAffected" INTEGER NOT NULL DEFAULT 0,
    "moraEnabled" BOOLEAN NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL,
    "notificationMode" "NotificationMode" NOT NULL,
    "totalMoraApplied" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "notificationsFailed" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "executionDate" DATE NOT NULL,

    CONSTRAINT "daily_closing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_closing_logs_executedAt_idx" ON "daily_closing_logs"("executedAt");

-- CreateIndex
CREATE INDEX "daily_closing_logs_success_idx" ON "daily_closing_logs"("success");

-- CreateIndex
CREATE UNIQUE INDEX "daily_closing_logs_executionDate_key" ON "daily_closing_logs"("executionDate");
