const { repositoriesContainer } = require('./repositories.container');

const { CreateLoanUseCase } = require('../../application/use-cases/loans/CreateLoanUseCase');
const { ApproveLoanUseCase } = require('../../application/use-cases/loans/ApproveLoanUseCase');
const { RejectLoanUseCase } = require('../../application/use-cases/loans/RejectLoanUseCase');
const { DisburseLoanUseCase } = require('../../application/use-cases/loans/DisburseLoanUseCase');
const { GetLoansUseCase } = require('../../application/use-cases/loans/GetLoansUseCase');
const { GetLoanOptionsUseCase } = require('../../application/use-cases/loans/GetLoanOptionsUseCase');
const { GetLoanByIdUseCase } = require('../../application/use-cases/loans/GetLoanByIdUseCase');
const { GetLoanScheduleUseCase } = require('../../application/use-cases/loans/GetLoanScheduleUseCase');
const { GetLoanStatsUseCase } = require('../../application/use-cases/loans/GetLoanStatsUseCase');
const { GetLoanScheduleSummaryUseCase } = require('../../application/use-cases/loans/GetLoanScheduleSummaryUseCase');
const { GetPendingLoanStatsUseCase } = require('../../application/use-cases/loans/GetPendingLoanStatsUseCase');
const { RescheduleLoanUseCase } = require('../../application/use-cases/loans/RescheduleLoanUseCase');

const { RegisterPaymentUseCase } = require('../../application/use-cases/loans/RegisterPaymentUseCase');
const { ConfirmPaymentUseCase } = require('../../application/use-cases/payments/ConfirmPaymentUseCase');
const { GetPaymentsUseCase } = require('../../application/use-cases/payments/GetPaymentsUseCase');
const { GetPaymentsByLoanUseCase } = require('../../application/use-cases/payments/GetPaymentsByLoanUseCase');
const { GetPaymentsStatsUseCase } = require('../../application/use-cases/payments/GetPaymentsStatsUseCase');
const { GetPendingPaymentsByClientUseCase } = require('../../application/use-cases/payments/GetPendingPaymentsByClientUseCase');
const { GetPaymentByIdUseCase } = require('../../application/use-cases/payments/GetPaymentByIdUseCase');
const { DashboardAnalyticsUseCase } = require('../../application/use-cases/dashboard/DashboardAnalyticsUseCase');
const { AdminClosingUseCase } = require('../../application/use-cases/admin/AdminClosingUseCase');
const { ReportsUseCase } = require('../../application/use-cases/reports/ReportsUseCase');
const { AuthUseCase } = require('../../application/use-cases/auth/AuthUseCase');
const { ManageCategoriesUseCase } = require('../../application/use-cases/categories/ManageCategoriesUseCase');
const { ManageConfigUseCase } = require('../../application/use-cases/config/ManageConfigUseCase');
const { ManageClientsUseCase } = require('../../application/use-cases/clients/ManageClientsUseCase');

const amortizationService = require('../../services/amortization.service');
const notificationService = require('../../services/notification.service');
const authService = require('../../services/auth.service');
const tokenRevocationService = require('../../services/tokenRevocation.service');
const cronService = require('../../services/cron.service');
const monthlyClosingService = require('../../services/monthly-closing.service');
const reportsService = require('../../services/reports.service');
const scoringService = require('../../services/scoring.service');
const dailyClosingScheduler = require('../../jobs/schedulers/daily-closing.scheduler');

const {
    loanRepository,
    clientRepository,
    configRepository,
    paymentRepository,
    paymentScheduleRepository,
    clientCategoryRepository
} = repositoriesContainer;

const useCasesContainer = {
    loans: {
        createLoanUseCase: new CreateLoanUseCase(
            loanRepository,
            clientRepository,
            configRepository,
            amortizationService
        ),
        approveLoanUseCase: new ApproveLoanUseCase(loanRepository, amortizationService),
        rejectLoanUseCase: new RejectLoanUseCase(loanRepository),
        disburseLoanUseCase: new DisburseLoanUseCase(loanRepository),
        getLoansUseCase: new GetLoansUseCase(loanRepository),
        getLoanOptionsUseCase: new GetLoanOptionsUseCase(loanRepository),
        getLoanByIdUseCase: new GetLoanByIdUseCase(loanRepository),
        getLoanScheduleUseCase: new GetLoanScheduleUseCase(paymentScheduleRepository),
        getLoanStatsUseCase: new GetLoanStatsUseCase(loanRepository),
        getLoanScheduleSummaryUseCase: new GetLoanScheduleSummaryUseCase(paymentScheduleRepository),
        getPendingLoanStatsUseCase: new GetPendingLoanStatsUseCase(loanRepository),
        rescheduleLoanUseCase: new RescheduleLoanUseCase(
            loanRepository,
            paymentScheduleRepository,
            amortizationService
        )
    },
    payments: {
        registerPaymentUseCase: new RegisterPaymentUseCase(
            loanRepository,
            paymentRepository,
            paymentScheduleRepository,
            notificationService
        ),
        confirmPaymentUseCase: new ConfirmPaymentUseCase(paymentRepository),
        getPaymentsUseCase: new GetPaymentsUseCase(paymentRepository),
        getPaymentsByLoanUseCase: new GetPaymentsByLoanUseCase(paymentRepository),
        getPaymentsStatsUseCase: new GetPaymentsStatsUseCase(paymentRepository),
        getPendingPaymentsByClientUseCase: new GetPendingPaymentsByClientUseCase(
            loanRepository,
            paymentScheduleRepository
        ),
        getPaymentByIdUseCase: new GetPaymentByIdUseCase(paymentRepository)
    },
    dashboard: {
        dashboardAnalyticsUseCase: new DashboardAnalyticsUseCase(
            loanRepository,
            paymentRepository,
            clientRepository,
            clientCategoryRepository
        )
    },
    admin: {
        adminClosingUseCase: new AdminClosingUseCase({
            cronService,
            monthlyClosingService,
            dailyClosingScheduler
        })
    },
    reports: {
        reportsUseCase: new ReportsUseCase(reportsService)
    },
    auth: {
        authUseCase: new AuthUseCase(authService, tokenRevocationService)
    },
    clients: {
        manageClientsUseCase: new ManageClientsUseCase(clientRepository, scoringService)
    },
    categories: {
        manageCategoriesUseCase: new ManageCategoriesUseCase(clientCategoryRepository)
    },
    config: {
        manageConfigUseCase: new ManageConfigUseCase(configRepository)
    }
};

module.exports = {
    useCasesContainer
};