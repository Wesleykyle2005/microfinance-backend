const { CreateLoanDto } = require('../../../application/dtos/loans/CreateLoanDto');
const { useCasesContainer } = require('../../../infrastructure/container/useCases.container');

const {
    createLoanUseCase,
    approveLoanUseCase,
    rejectLoanUseCase,
    disburseLoanUseCase,
    getLoansUseCase,
    getLoanOptionsUseCase,
    getLoanByIdUseCase,
    getLoanScheduleUseCase,
    getLoanStatsUseCase,
    getLoanScheduleSummaryUseCase,
    getPendingLoanStatsUseCase,
    rescheduleLoanUseCase
} = useCasesContainer.loans;

async function getLoans(req, res, next) {
    try {
        const result = await getLoansUseCase.execute(req.query);

        res.status(200).json({
            success: true,
            data: result.loans,
            meta: result.meta
        });
    } catch (error) {
        next(error);
    }
}

async function getLoanOptions(req, res, next) {
    try {
        const data = await getLoanOptionsUseCase.execute(req.query);

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

async function getLoan(req, res, next) {
    try {
        const loan = await getLoanByIdUseCase.execute(req.params.id);

        if (!loan) {
            return res.status(404).json({
                success: false,
                error: 'Préstamo no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            data: loan
        });
    } catch (error) {
        next(error);
    }
}

async function getLoanSchedule(req, res, next) {
    try {
        const result = await getLoanScheduleUseCase.execute(req.params.id, req.query);

        if (!result.items || result.items.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No se encontró calendario para este préstamo'
            });
        }

        res.status(200).json({
            success: true,
            data: result.items,
            meta: result.meta
        });
    } catch (error) {
        next(error);
    }
}

async function getLoanStats(req, res, next) {
    try {
        const data = await getLoanStatsUseCase.execute(req.query);

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

async function getLoanSchedulesSummary(req, res, next) {
    try {
        const data = await getLoanScheduleSummaryUseCase.execute(req.query);

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

async function getPendingLoanStats(req, res, next) {
    try {
        const data = await getPendingLoanStatsUseCase.execute(req.query);

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

async function createLoan(req, res, next) {
    try {
        const dto = CreateLoanDto.fromRequest(req.body, req.user.id);
        const loan = await createLoanUseCase.execute(dto);

        res.status(201).json({
            success: true,
            data: loan
        });
    } catch (error) {
        next(error);
    }
}

async function approveLoan(req, res, next) {
    try {
        const result = await approveLoanUseCase.execute({
            loanId: req.params.id,
            userId: req.user.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(200).json({
            success: true,
            message: 'Préstamo aprobado y activado exitosamente',
            data: result.loan,
            newSchedule: result.schedule.map((item) => ({
                paymentNumber: item.paymentNumber,
                dueDate: item.dueDate,
                capital: item.principalDueAmount,
                interest: item.interestAmount,
                total: item.totalDue
            })),
            meta: {
                approvalDate: result.approvalTimestamp,
                maturityDate: result.schedule[result.schedule.length - 1].dueDate,
                scheduleRegenerated: true
            }
        });
    } catch (error) {
        if (error.message === 'LOAN_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                error: 'Préstamo no encontrado'
            });
        }

        if (error.message.startsWith('LOAN_STATUS_INVALID:')) {
            const [, status] = error.message.split(':');
            return res.status(400).json({
                success: false,
                error: `No se puede aprobar un préstamo en estado ${status}`
            });
        }

        next(error);
    }
}

async function rejectLoan(req, res, next) {
    try {
        if (!req.body.reason) {
            return res.status(400).json({
                success: false,
                error: 'El motivo de rechazo es requerido'
            });
        }

        const loan = await rejectLoanUseCase.execute({
            loanId: req.params.id,
            reason: req.body.reason,
            userId: req.user.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(200).json({
            success: true,
            message: 'Préstamo cancelado exitosamente',
            data: loan
        });
    } catch (error) {
        if (error.message === 'LOAN_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                error: 'Préstamo no encontrado'
            });
        }

        if (error.message.startsWith('LOAN_STATUS_INVALID:')) {
            const [, status] = error.message.split(':');
            return res.status(400).json({
                success: false,
                error: `No se puede rechazar un préstamo en estado ${status}`
            });
        }

        next(error);
    }
}

async function disburseLoan(req, res, next) {
    try {
        const loan = await disburseLoanUseCase.execute({
            loanId: req.params.id,
            userId: req.user.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(200).json({
            success: true,
            message: 'Préstamo desembolsado exitosamente',
            data: loan
        });
    } catch (error) {
        if (error.message === 'LOAN_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                error: 'Préstamo no encontrado'
            });
        }

        if (error.message === 'LOAN_ALREADY_DISBURSED') {
            return res.status(400).json({
                success: false,
                error: 'El préstamo ya fue desembolsado'
            });
        }

        if (error.message.startsWith('LOAN_STATUS_INVALID:')) {
            const [, status] = error.message.split(':');
            return res.status(400).json({
                success: false,
                error: `El préstamo debe estar ACTIVE para desembolsar (actual: ${status})`
            });
        }

        next(error);
    }
}

async function rescheduleLoan(req, res, next) {
    try {
        const result = await rescheduleLoanUseCase.execute({
            loanId: req.params.id,
            newStartDate: req.body.newStartDate,
            reason: req.body.reason,
            userId: req.user.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(200).json({
            success: true,
            message: `Reagendamiento exitoso: ${result.installments.length} cuotas actualizadas`,
            data: {
                loanId: req.params.id,
                folio: result.loan.folio,
                clientName: result.loan.client.fullName,
                reason: result.reason,
                newStartDate: result.parsedStartDate,
                newMaturityDate: result.newMaturityDate,
                installmentsRescheduled: result.installments.length,
                overdueReverted: result.installments.filter((i) => i.oldStatus === 'OVERDUE').length,
                schedule: result.installments.map((i) => ({
                    paymentNumber: i.paymentNumber,
                    oldDueDate: i.oldDueDate,
                    newDueDate: i.newDueDate,
                    status: i.newStatus
                }))
            }
        });
    } catch (error) {
        if (error.message === 'RESCHEDULE_REQUIRED_FIELDS') {
            return res.status(400).json({
                success: false,
                error: 'newStartDate y reason son requeridos'
            });
        }

        if (error.message === 'RESCHEDULE_INVALID_DATE') {
            return res.status(400).json({
                success: false,
                error: 'newStartDate no es una fecha válida'
            });
        }

        if (error.message === 'LOAN_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                error: 'Préstamo no encontrado'
            });
        }

        if (error.message === 'RESCHEDULE_NO_PENDING_INSTALLMENTS') {
            return res.status(400).json({
                success: false,
                error: 'No hay cuotas pendientes para reagendar'
            });
        }

        if (error.message.startsWith('LOAN_STATUS_INVALID:')) {
            const [, status] = error.message.split(':');
            return res.status(400).json({
                success: false,
                error: `Solo se pueden reagendar préstamos ACTIVE (actual: ${status})`
            });
        }

        next(error);
    }
}

module.exports = {
    getLoans,
    getLoanOptions,
    getLoan,
    getLoanSchedule,
    getLoanStats,
    getLoanSchedulesSummary,
    getPendingLoanStats,
    createLoan,
    approveLoan,
    rejectLoan,
    disburseLoan,
    rescheduleLoan
};
