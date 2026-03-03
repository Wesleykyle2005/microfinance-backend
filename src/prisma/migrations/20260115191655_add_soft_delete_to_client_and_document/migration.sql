-- AlterTable
ALTER TABLE "client_profiles" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "client_profiles_isActive_idx" ON "client_profiles"("isActive");

-- CreateIndex
CREATE INDEX "documents_isActive_idx" ON "documents"("isActive");
