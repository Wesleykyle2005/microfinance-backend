-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COBRADOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('AUTOMATIC', 'MANUAL', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TransitionTrigger" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'ACTIVE', 'DEFAULTED', 'PAID_OFF');

-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('NIO', 'USD');

-- CreateEnum
CREATE TYPE "PaymentScheduleStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CHECK', 'MOBILE_MONEY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "MoraApplicationType" AS ENUM ('DAILY', 'MANUAL');

-- CreateEnum
CREATE TYPE "MoraCalculationType" AS ENUM ('DAILY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CLIENT_ID', 'CLIENT_PHOTO', 'LOAN_CONTRACT', 'PAYMENT_VOUCHER', 'RECEIPT_PDF', 'OTHER');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('PAYMENT_DUE_TODAY', 'PAYMENT_OVERDUE_1D', 'PAYMENT_OVERDUE_3D', 'PAYMENT_REMINDER_3D', 'PAYMENT_CONFIRMED', 'LOAN_APPROVED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('DELIVERED', 'READ', 'FAILED', 'BOUNCED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SUPER_ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_admin_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "whatsappNumber" TEXT,
    "whatsappNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notificationEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admin_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_profiles" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "identificationNumber" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "secondaryPhone" TEXT,
    "email" TEXT,
    "businessName" TEXT,
    "businessType" TEXT,
    "address" TEXT,
    "city" TEXT,
    "monthlyIncome" DECIMAL(12,2),
    "scoringPoints" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "isCreditBlocked" BOOLEAN NOT NULL DEFAULT false,
    "lastCategoryChange" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "minScore" INTEGER NOT NULL,
    "maxScore" INTEGER,
    "creditMultiplier" DECIMAL(3,2) NOT NULL,
    "approvalType" "ApprovalType" NOT NULL,
    "colorHex" TEXT,
    "iconName" TEXT,
    "priorityOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_category_transitions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "oldCategoryId" TEXT,
    "newCategoryId" TEXT NOT NULL,
    "reason" TEXT,
    "triggeredBy" "TransitionTrigger" NOT NULL,
    "triggeredByUserId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientCategoryId" TEXT,

    CONSTRAINT "client_category_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_history" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "pointsChange" INTEGER NOT NULL,
    "newTotalPoints" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "triggerLoanId" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoring_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "collectorId" TEXT,
    "principalAmount" DECIMAL(12,2) NOT NULL,
    "approvedAmount" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL,
    "lateFeeRate" DECIMAL(5,2) NOT NULL,
    "interestTotal" DECIMAL(12,2) NOT NULL,
    "lateFeesAccrued" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "termDays" INTEGER NOT NULL,
    "frequency" "PaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
    "currency" "Currency" NOT NULL DEFAULT 'NIO',
    "statusLoan" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "approvalDate" TIMESTAMP(3),
    "disbursementDate" TIMESTAMP(3),
    "maturityDate" TIMESTAMP(3),
    "disbursementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_schedules" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "paymentNumber" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "principalDueAmount" DECIMAL(12,2) NOT NULL,
    "interestAmount" DECIMAL(12,2) NOT NULL,
    "lateFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDue" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "paidDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_repayment_plans" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "originalTermDays" INTEGER NOT NULL,
    "newTermDays" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedByUserId" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "oldMaturityDate" DATE NOT NULL,
    "newMaturityDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_repayment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disbursements" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'NIO',
    "disbursedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disbursements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "voucherPhotoUrl" TEXT,
    "receiptPdfUrl" TEXT,
    "receiptFolio" TEXT,
    "notes" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mora_application_logs" (
    "id" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "moraAmountApplied" DECIMAL(12,2) NOT NULL,
    "dailyRate" DECIMAL(5,4) NOT NULL,
    "daysOverdue" INTEGER NOT NULL,
    "applicationType" "MoraApplicationType" NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL,
    "appliedByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mora_application_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_snapshots" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalPrincipalRecovered" DECIMAL(12,2) NOT NULL,
    "totalInterestCollected" DECIMAL(12,2) NOT NULL,
    "totalLateFeesCollected" DECIMAL(12,2) NOT NULL,
    "totalPrincipalOutstanding" DECIMAL(12,2) NOT NULL,
    "investorShare" DECIMAL(12,2) NOT NULL,
    "adminShare" DECIMAL(12,2) NOT NULL,
    "exchangeRateApplied" DECIMAL(10,4),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "balance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "defaultInterestRate" DECIMAL(5,2) NOT NULL,
    "defaultLateFeeRate" DECIMAL(5,2) NOT NULL,
    "exchangeRateNioUsd" DECIMAL(10,4) NOT NULL,
    "moraCalculationType" "MoraCalculationType" NOT NULL DEFAULT 'DAILY',
    "moraEnabled" BOOLEAN NOT NULL DEFAULT true,
    "investorSharePercentage" DECIMAL(5,2) NOT NULL,
    "adminSharePercentage" DECIMAL(5,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuration_history" (
    "id" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "systemConfigId" TEXT,

    CONSTRAINT "configuration_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,
    "mimeType" TEXT,
    "relatedEntityType" TEXT NOT NULL,
    "relatedEntityId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" TIMESTAMP(3),
    "notes" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "clientProfileId" TEXT,
    "loanId" TEXT,
    "paymentId" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_notifications" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL,
    "loanId" TEXT,
    "loanFolio" TEXT NOT NULL,
    "dueAmount" DECIMAL(12,2),
    "messageBody" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "externalMessageId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveryConfirmedAt" TIMESTAMP(3),

    CONSTRAINT "whatsapp_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "externalMessageId" TEXT,
    "statusAtTime" "NotificationStatus" NOT NULL,
    "deliveryStatus" "DeliveryStatus" NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "n8nResponse" JSONB,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "users_lastLogin_idx" ON "users"("lastLogin");

-- CreateIndex
CREATE UNIQUE INDEX "super_admin_profiles_userId_key" ON "super_admin_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "super_admin_profiles_taxId_key" ON "super_admin_profiles"("taxId");

-- CreateIndex
CREATE UNIQUE INDEX "client_profiles_identificationNumber_key" ON "client_profiles"("identificationNumber");

-- CreateIndex
CREATE INDEX "client_profiles_categoryId_idx" ON "client_profiles"("categoryId");

-- CreateIndex
CREATE INDEX "client_profiles_scoringPoints_idx" ON "client_profiles"("scoringPoints");

-- CreateIndex
CREATE INDEX "client_profiles_city_idx" ON "client_profiles"("city");

-- CreateIndex
CREATE INDEX "client_profiles_createdBy_idx" ON "client_profiles"("createdBy");

-- CreateIndex
CREATE INDEX "client_profiles_categoryId_scoringPoints_idx" ON "client_profiles"("categoryId", "scoringPoints");

-- CreateIndex
CREATE UNIQUE INDEX "client_categories_name_key" ON "client_categories"("name");

-- CreateIndex
CREATE INDEX "client_categories_priorityOrder_idx" ON "client_categories"("priorityOrder");

-- CreateIndex
CREATE INDEX "client_categories_minScore_maxScore_idx" ON "client_categories"("minScore", "maxScore");

-- CreateIndex
CREATE INDEX "client_category_transitions_clientId_idx" ON "client_category_transitions"("clientId");

-- CreateIndex
CREATE INDEX "client_category_transitions_changedAt_idx" ON "client_category_transitions"("changedAt");

-- CreateIndex
CREATE INDEX "client_category_transitions_clientId_changedAt_idx" ON "client_category_transitions"("clientId", "changedAt");

-- CreateIndex
CREATE INDEX "scoring_history_clientId_idx" ON "scoring_history"("clientId");

-- CreateIndex
CREATE INDEX "scoring_history_triggeredAt_idx" ON "scoring_history"("triggeredAt");

-- CreateIndex
CREATE INDEX "scoring_history_triggerLoanId_idx" ON "scoring_history"("triggerLoanId");

-- CreateIndex
CREATE INDEX "scoring_history_clientId_triggeredAt_idx" ON "scoring_history"("clientId", "triggeredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "loans_folio_key" ON "loans"("folio");

-- CreateIndex
CREATE INDEX "loans_clientId_idx" ON "loans"("clientId");

-- CreateIndex
CREATE INDEX "loans_statusLoan_idx" ON "loans"("statusLoan");

-- CreateIndex
CREATE INDEX "loans_disbursementId_idx" ON "loans"("disbursementId");

-- CreateIndex
CREATE INDEX "loans_maturityDate_statusLoan_idx" ON "loans"("maturityDate", "statusLoan");

-- CreateIndex
CREATE INDEX "loans_clientId_statusLoan_idx" ON "loans"("clientId", "statusLoan");

-- CreateIndex
CREATE INDEX "payment_schedules_loanId_idx" ON "payment_schedules"("loanId");

-- CreateIndex
CREATE INDEX "payment_schedules_dueDate_idx" ON "payment_schedules"("dueDate");

-- CreateIndex
CREATE INDEX "payment_schedules_status_idx" ON "payment_schedules"("status");

-- CreateIndex
CREATE INDEX "payment_schedules_loanId_status_idx" ON "payment_schedules"("loanId", "status");

-- CreateIndex
CREATE INDEX "loan_repayment_plans_loanId_idx" ON "loan_repayment_plans"("loanId");

-- CreateIndex
CREATE INDEX "loan_repayment_plans_effectiveDate_idx" ON "loan_repayment_plans"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "disbursements_folio_key" ON "disbursements"("folio");

-- CreateIndex
CREATE INDEX "disbursements_disbursedAt_idx" ON "disbursements"("disbursedAt");

-- CreateIndex
CREATE INDEX "disbursements_createdBy_idx" ON "disbursements"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receiptFolio_key" ON "payments"("receiptFolio");

-- CreateIndex
CREATE INDEX "payments_loanId_idx" ON "payments"("loanId");

-- CreateIndex
CREATE INDEX "payments_paymentDate_idx" ON "payments"("paymentDate");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_loanId_paymentDate_idx" ON "payments"("loanId", "paymentDate" DESC);

-- CreateIndex
CREATE INDEX "mora_application_logs_installmentId_idx" ON "mora_application_logs"("installmentId");

-- CreateIndex
CREATE INDEX "mora_application_logs_loanId_idx" ON "mora_application_logs"("loanId");

-- CreateIndex
CREATE INDEX "mora_application_logs_appliedAt_idx" ON "mora_application_logs"("appliedAt");

-- CreateIndex
CREATE INDEX "mora_application_logs_loanId_appliedAt_idx" ON "mora_application_logs"("loanId", "appliedAt" DESC);

-- CreateIndex
CREATE INDEX "balance_snapshots_generatedAt_idx" ON "balance_snapshots"("generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "balance_snapshots_month_year_key" ON "balance_snapshots"("month", "year");

-- CreateIndex
CREATE INDEX "configuration_history_parameterName_idx" ON "configuration_history"("parameterName");

-- CreateIndex
CREATE INDEX "configuration_history_changedAt_idx" ON "configuration_history"("changedAt");

-- CreateIndex
CREATE INDEX "configuration_history_parameterName_changedAt_idx" ON "configuration_history"("parameterName", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_userId_action_timestamp_idx" ON "audit_logs"("userId", "action", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_timestamp_idx" ON "audit_logs"("entityType", "entityId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "documents_relatedEntityType_relatedEntityId_idx" ON "documents"("relatedEntityType", "relatedEntityId");

-- CreateIndex
CREATE INDEX "documents_documentType_idx" ON "documents"("documentType");

-- CreateIndex
CREATE INDEX "documents_uploadedAt_idx" ON "documents"("uploadedAt");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_status_idx" ON "whatsapp_notifications"("status");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_clientId_idx" ON "whatsapp_notifications"("clientId");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_createdAt_idx" ON "whatsapp_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_status_createdAt_idx" ON "whatsapp_notifications"("status", "createdAt");

-- CreateIndex
CREATE INDEX "notification_logs_notificationId_idx" ON "notification_logs"("notificationId");

-- CreateIndex
CREATE INDEX "notification_logs_deliveryStatus_idx" ON "notification_logs"("deliveryStatus");

-- CreateIndex
CREATE INDEX "notification_logs_loggedAt_idx" ON "notification_logs"("loggedAt");

-- CreateIndex
CREATE INDEX "notification_logs_notificationId_loggedAt_idx" ON "notification_logs"("notificationId", "loggedAt" DESC);

-- AddForeignKey
ALTER TABLE "super_admin_profiles" ADD CONSTRAINT "super_admin_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "client_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_category_transitions" ADD CONSTRAINT "client_category_transitions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_category_transitions" ADD CONSTRAINT "client_category_transitions_oldCategoryId_fkey" FOREIGN KEY ("oldCategoryId") REFERENCES "client_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_category_transitions" ADD CONSTRAINT "client_category_transitions_newCategoryId_fkey" FOREIGN KEY ("newCategoryId") REFERENCES "client_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_category_transitions" ADD CONSTRAINT "client_category_transitions_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_category_transitions" ADD CONSTRAINT "client_category_transitions_clientCategoryId_fkey" FOREIGN KEY ("clientCategoryId") REFERENCES "client_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_history" ADD CONSTRAINT "scoring_history_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_history" ADD CONSTRAINT "scoring_history_triggerLoanId_fkey" FOREIGN KEY ("triggerLoanId") REFERENCES "loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_disbursementId_fkey" FOREIGN KEY ("disbursementId") REFERENCES "disbursements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_repayment_plans" ADD CONSTRAINT "loan_repayment_plans_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_repayment_plans" ADD CONSTRAINT "loan_repayment_plans_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mora_application_logs" ADD CONSTRAINT "mora_application_logs_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "payment_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mora_application_logs" ADD CONSTRAINT "mora_application_logs_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mora_application_logs" ADD CONSTRAINT "mora_application_logs_appliedByUserId_fkey" FOREIGN KEY ("appliedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_snapshots" ADD CONSTRAINT "balance_snapshots_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_config" ADD CONSTRAINT "system_config_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuration_history" ADD CONSTRAINT "configuration_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuration_history" ADD CONSTRAINT "configuration_history_systemConfigId_fkey" FOREIGN KEY ("systemConfigId") REFERENCES "system_config"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "client_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notifications" ADD CONSTRAINT "whatsapp_notifications_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notifications" ADD CONSTRAINT "whatsapp_notifications_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "whatsapp_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
