-- AlterEnum
ALTER TYPE "LoanStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "client_profiles" ALTER COLUMN "identificationNumber" DROP NOT NULL;

-- AlterTable
ALTER TABLE "loans" ADD COLUMN     "interestPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lateFeesPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "principalPaid" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "system_config" ALTER COLUMN "moraEnabled" SET DEFAULT false;
