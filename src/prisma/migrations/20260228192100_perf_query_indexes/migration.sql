-- CreateIndex
CREATE INDEX "balance_snapshots_year_month_idx" ON "balance_snapshots"("year", "month");

-- CreateIndex
CREATE INDEX "client_categories_isActive_priorityOrder_idx" ON "client_categories"("isActive", "priorityOrder");

-- CreateIndex
CREATE INDEX "client_profiles_isActive_createdAt_idx" ON "client_profiles"("isActive", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "client_profiles_isActive_categoryId_idx" ON "client_profiles"("isActive", "categoryId");

-- CreateIndex
CREATE INDEX "client_profiles_isActive_city_idx" ON "client_profiles"("isActive", "city");

-- CreateIndex
CREATE INDEX "loans_disbursementDate_statusLoan_idx" ON "loans"("disbursementDate", "statusLoan");

-- CreateIndex
CREATE INDEX "loans_createdAt_statusLoan_idx" ON "loans"("createdAt", "statusLoan");

-- CreateIndex
CREATE INDEX "loans_statusLoan_createdAt_idx" ON "loans"("statusLoan", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "loans_collectorId_createdAt_idx" ON "loans"("collectorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "loans_clientId_createdAt_idx" ON "loans"("clientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "payment_schedules_status_dueDate_idx" ON "payment_schedules"("status", "dueDate");

-- CreateIndex
CREATE INDEX "payment_schedules_loanId_status_dueDate_idx" ON "payment_schedules"("loanId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "payments_paymentDate_status_idx" ON "payments"("paymentDate", "status");

-- CreateIndex
CREATE INDEX "payments_status_paymentDate_idx" ON "payments"("status", "paymentDate" DESC);

-- CreateIndex
CREATE INDEX "payments_loanId_status_paymentDate_idx" ON "payments"("loanId", "status", "paymentDate" DESC);
