const { RegisterPaymentDto } = require('../../../application/dtos/loans/RegisterPaymentDto');
const { PendingPaymentsByClientQueryDto } = require('../../../application/dtos/payments/PendingPaymentsByClientQueryDto');
const { useCasesContainer } = require('../../../infrastructure/container/useCases.container');

const {
    registerPaymentUseCase,
    confirmPaymentUseCase,
    getPaymentsUseCase,
    getPaymentsByLoanUseCase,
    getPaymentsStatsUseCase,
    getPendingPaymentsByClientUseCase,
    getPaymentByIdUseCase
} = useCasesContainer.payments;

async function getPayments(req, res, next) {
    try {
        const result = await getPaymentsUseCase.execute(req.query);

        res.status(200).json({
            success: true,
            data: result.payments,
            totals: result.totals,
            meta: result.meta
        });
    } catch (error) {
        next(error);
    }
}

async function getPaymentsByLoan(req, res, next) {
    try {
        const result = await getPaymentsByLoanUseCase.execute(req.params.loanId, req.query);

        res.status(200).json({
            success: true,
            data: result.payments,
            totals: result.totals,
            meta: result.meta
        });
    } catch (error) {
        next(error);
    }
}

async function getPaymentsStats(req, res, next) {
    try {
        const data = await getPaymentsStatsUseCase.execute(req.query);

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

async function getPendingByClient(req, res, next) {
    try {
        const dto = PendingPaymentsByClientQueryDto.fromRequest(req.query);
        const { clientId } = dto;

        const data = await getPendingPaymentsByClientUseCase.execute(clientId);

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        if (error.message === 'CLIENT_ID_REQUIRED' || error.statusCode === 400) {
            return res.status(400).json({
                success: false,
                error: 'El parámetro clientId es requerido'
            });
        }

        next(error);
    }
}

async function getPayment(req, res, next) {
    try {
        const payment = await getPaymentByIdUseCase.execute(req.params.id);

        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Pago no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            data: payment
        });
    } catch (error) {
        next(error);
    }
}

async function createPayment(req, res, next) {
    try {
        const dto = RegisterPaymentDto.fromRequest(req.body, req.user.id);
        const payment = await registerPaymentUseCase.execute(dto);

        res.status(201).json({
            success: true,
            data: payment
        });
    } catch (error) {
        next(error);
    }
}

async function confirmPayment(req, res, next) {
    try {
        const payment = await confirmPaymentUseCase.execute({
            paymentId: req.params.id,
            userId: req.user.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(200).json({
            success: true,
            message: 'Pago confirmado exitosamente',
            data: payment
        });
    } catch (error) {
        if (error.message === 'PAYMENT_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                error: 'Pago no encontrado'
            });
        }

        if (error.message.startsWith('PAYMENT_STATUS_INVALID:')) {
            const [, status] = error.message.split(':');
            return res.status(400).json({
                success: false,
                error: `Solo se pueden confirmar pagos en estado PENDING. Estado actual: ${status}`
            });
        }

        next(error);
    }
}

module.exports = {
    getPayments,
    createPayment,
    confirmPayment,
    getPaymentsByLoan,
    getPaymentsStats,
    getPendingByClient,
    getPayment
};