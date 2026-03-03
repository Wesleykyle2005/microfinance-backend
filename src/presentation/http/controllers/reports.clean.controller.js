const asyncHandler = require('express-async-handler');
const { useCasesContainer } = require('../../../infrastructure/container/useCases.container');
const { GenerateReportDto } = require('../../../application/dtos/reports/GenerateReportDto');
const { LoanReportQueryDto } = require('../../../application/dtos/reports/LoanReportQueryDto');
const { EntityIdParamDto } = require('../../../application/dtos/reports/EntityIdParamDto');
const moment = require('moment-timezone');

const { reportsUseCase } = useCasesContainer.reports;

const TIMEZONE = 'America/Managua';

const getCartera = asyncHandler(async (req, res) => {
    const dto = GenerateReportDto.fromRequest('cartera', req.query);
    const { format, month, year, status } = dto;

    if (month && (month < 1 || month > 12)) {
        return res.status(400).json({
            error: 'Mes inválido. Debe estar entre 1 y 12'
        });
    }

    if (year && (year < 2000 || year > 2100)) {
        return res.status(400).json({
            error: 'Año inválido'
        });
    }

    try {
        const filters = {};
        if (month) filters.month = month;
        if (year) filters.year = year;
        if (status) filters.status = status;
        const carteraData = await reportsUseCase.getCarteraData(filters);

        if (carteraData.length === 0) {
            return res.status(404).json({
                error: 'No se encontraron préstamos con los filtros especificados'
            });
        }

        if (format === 'json') {
            return res.json({
                success: true,
                data: carteraData
            });
        }

        if (format !== 'excel') {
            return res.status(400).json({
                error: 'Formato no soportado. Use format=excel o format=json'
            });
        }

        const metadata = { month: filters.month, year: filters.year };
        const excelBuffer = await reportsUseCase.generateCarteraExcel(carteraData, metadata);

        const fileName = month && year
            ? `cartera_${moment().month(month - 1).format('MMMM')}_${year}.xlsx`
            : `cartera_${moment().tz(TIMEZONE).format('MMMM_YYYY')}.xlsx`;

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${fileName}"`
        );
        res.setHeader('Content-Length', excelBuffer.length);

        res.send(excelBuffer);
    } catch (error) {
        console.error('Error generando reporte de cartera:', error);
        res.status(500).json({
            error: 'Error generando reporte de cartera',
            details: error.message
        });
    }
});

const getCarteraOverview = asyncHandler(async (req, res) => {
    const dto = GenerateReportDto.fromRequest('cartera-overview', req.query);
    const { month, year, status } = dto;

    if (month && (month < 1 || month > 12)) {
        return res.status(400).json({
            error: 'Mes inválido. Debe estar entre 1 y 12'
        });
    }

    if (year && (year < 2000 || year > 2100)) {
        return res.status(400).json({
            error: 'Año inválido'
        });
    }

    const filters = {};
    if (month) filters.month = month;
    if (year) filters.year = year;
    if (status) filters.status = status;

    const data = await reportsUseCase.getCarteraOverview(filters);

    return res.json({
        success: true,
        data,
    });
});

const getCarteraLoansLight = asyncHandler(async (req, res) => {
    const dto = GenerateReportDto.fromRequest('cartera-loans', req.query);
    const { month, year, status } = dto;
    const { page, limit, search } = req.query;

    if (month && (month < 1 || month > 12)) {
        return res.status(400).json({
            error: 'Mes inválido. Debe estar entre 1 y 12'
        });
    }

    if (year && (year < 2000 || year > 2100)) {
        return res.status(400).json({
            error: 'Año inválido'
        });
    }

    const data = await reportsUseCase.getCarteraLoansLight({
        month: month ? parseInt(month, 10) : undefined,
        year: year ? parseInt(year, 10) : undefined,
        status,
        page,
        limit,
        search,
    });

    return res.json({
        success: true,
        ...data,
    });
});

const getCarteraInstallmentsByLoan = asyncHandler(async (req, res) => {
    const dto = LoanReportQueryDto.fromRequest(req.params, req.query);
    const { loanId, onlyOpen } = dto;

    const data = await reportsUseCase.getCarteraInstallmentsByLoan(loanId, {
        onlyOpen,
    });

    return res.json({
        success: true,
        data,
    });
});

const getCarteraPaymentsByLoan = asyncHandler(async (req, res) => {
    const dto = LoanReportQueryDto.fromRequest(req.params, req.query);
    const { loanId, page, limit, includePending } = dto;

    const data = await reportsUseCase.getCarteraPaymentsByLoan(loanId, {
        page,
        limit,
        includePending,
    });

    return res.json({
        success: true,
        ...data,
    });
});

const getMora = asyncHandler(async (req, res) => {
    const dto = GenerateReportDto.fromRequest('mora', req.query);
    const { format } = dto;

    if (format !== 'excel') {
        return res.status(400).json({
            error: 'Formato no soportado. Use format=excel'
        });
    }

    try {
        const moraData = await reportsUseCase.getMoraData();

        if (moraData.length === 0) {
            return res.status(404).json({
                error: 'No hay clientes en mora actualmente',
                message: '¡Excelente! Todos los clientes están al día.'
            });
        }

        const excelBuffer = await reportsUseCase.generateMoraExcel(moraData);

        const fileName = `clientes_mora_${moment().tz(TIMEZONE).format('DD_MM_YYYY')}.xlsx`;

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${fileName}"`
        );
        res.setHeader('Content-Length', excelBuffer.length);

        res.send(excelBuffer);
    } catch (error) {
        console.error('Error generando reporte de mora:', error);
        res.status(500).json({
            error: 'Error generando reporte de clientes en mora',
            details: error.message
        });
    }
});

const getMoraOverview = asyncHandler(async (req, res) => {
    const data = await reportsUseCase.getMoraOverview();

    return res.json({
        success: true,
        data,
    });
});

const getMoraLoansLight = asyncHandler(async (req, res) => {
    const { page, limit } = LoanReportQueryDto.fromRequest({}, req.query);
    const data = await reportsUseCase.getMoraLoansLight({ page, limit });

    return res.json({
        success: true,
        ...data,
    });
});

const getMoraInstallmentsByLoan = asyncHandler(async (req, res) => {
    const dto = LoanReportQueryDto.fromRequest(req.params, req.query);
    const { loanId } = dto;
    const data = await reportsUseCase.getCarteraInstallmentsByLoan(loanId, {
        onlyOpen: true,
    });

    const overdueOnly = data.filter((item) => item.status === 'OVERDUE');

    return res.json({
        success: true,
        data: overdueOnly,
    });
});

const getBalance = asyncHandler(async (req, res) => {
    const dto = GenerateReportDto.fromBalanceRequest(req.params, req.query);
    const { month: monthNum, year: yearNum, format } = dto;

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
            error: 'Mes inválido. Debe estar entre 1 y 12'
        });
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({
            error: 'Año inválido'
        });
    }

    if (format === 'pdf') {
        try {
            const balanceData = await reportsUseCase.getBalanceData(monthNum, yearNum);
            const pdfBuffer = await reportsUseCase.generateBalancePdf(balanceData, monthNum, yearNum);
            const monthName = moment().month(monthNum - 1).format('MMMM').toLowerCase();
            const fileName = `balance_${monthName}_${yearNum}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            return res.send(pdfBuffer);
        } catch (error) {
            if (error.message.includes('No existe balance')) {
                return res.status(404).json({
                    error: 'Balance no encontrado',
                    details: error.message,
                    hint: 'Asegúrese de que se haya generado el balance para ese mes/año'
                });
            }

            return res.status(500).json({
                error: 'Error generando reporte PDF de balance mensual',
                details: error.message
            });
        }
    }

    if (format !== 'excel') {
        return res.status(400).json({
            error: 'Formato inválido. Use format=excel'
        });
    }

    try {
        const balanceData = await reportsUseCase.getBalanceData(monthNum, yearNum);

        const excelBuffer = await reportsUseCase.generateBalanceExcel(
            balanceData,
            monthNum,
            yearNum
        );

        const monthName = moment().month(monthNum - 1).format('MMMM').toLowerCase();
        const fileName = `balance_${monthName}_${yearNum}.xlsx`;

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${fileName}"`
        );
        res.setHeader('Content-Length', excelBuffer.length);

        res.send(excelBuffer);
    } catch (error) {
        console.error('Error generando reporte de balance:', error);

        if (error.message.includes('No existe balance')) {
            return res.status(404).json({
                error: 'Balance no encontrado',
                details: error.message,
                hint: 'Asegúrese de que se haya generado el balance para ese mes/año'
            });
        }

        res.status(500).json({
            error: 'Error generando reporte de balance mensual',
            details: error.message
        });
    }
});

const getClienteEstadoCuenta = asyncHandler(async (req, res) => {
    try {
        const dto = EntityIdParamDto.fromRequest(req.params);
        const { id } = dto;
        const payload = await reportsUseCase.getClienteEstadoCuentaData(id);
        const pdfBuffer = await reportsUseCase.generateClienteEstadoCuentaPdf(payload);
        const safeName = (payload.client.fullName || 'cliente').replace(/\s+/g, '_').toLowerCase();
        const fileName = `estado_cuenta_${safeName}_${moment().tz(TIMEZONE).format('YYYYMMDD')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    } catch (error) {
        if (error.message === 'CLIENT_NOT_FOUND') {
            return res.status(404).json({
                error: 'Cliente no encontrado',
                details: error.message
            });
        }

        return res.status(500).json({
            error: 'Error generando estado de cuenta',
            details: error.message
        });
    }
});

const getReciboPago = asyncHandler(async (req, res) => {
    try {
        const dto = EntityIdParamDto.fromRequest(req.params);
        const { paymentId } = dto;
        const payment = await reportsUseCase.getReciboPagoData(paymentId);
        const pdfBuffer = await reportsUseCase.generateReciboPagoPdf(payment);
        const fileName = `recibo_pago_${payment.receiptFolio || payment.id}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    } catch (error) {
        if (error.message === 'PAYMENT_NOT_FOUND') {
            return res.status(404).json({
                error: 'Pago no encontrado',
                details: error.message
            });
        }

        return res.status(500).json({
            error: 'Error generando recibo de pago',
            details: error.message
        });
    }
});

const getAvailableReports = asyncHandler(async (req, res) => {
    res.json({
        reportes_disponibles: [
            {
                nombre: 'Cartera - Resumen ligero',
                endpoint: '/api/reports/cartera/overview',
                formato: 'JSON',
                descripcion: 'KPIs de cartera sin detalle de cuotas',
                parametros: 'month (opcional), year (opcional), status (opcional)',
                estado: 'disponible'
            },
            {
                nombre: 'Cartera - Lista paginada',
                endpoint: '/api/reports/cartera/loans',
                formato: 'JSON',
                descripcion: 'Listado liviano de préstamos para tablas y búsquedas',
                parametros: 'page, limit, search, month, year, status',
                estado: 'disponible'
            },
            {
                nombre: 'Cartera - Cuotas por préstamo',
                endpoint: '/api/reports/cartera/loan/:loanId/installments',
                formato: 'JSON',
                descripcion: 'Detalle de cuotas por préstamo',
                parametros: 'loanId (requerido), onlyOpen (opcional)',
                estado: 'disponible'
            },
            {
                nombre: 'Cartera - Pagos por préstamo',
                endpoint: '/api/reports/cartera/loan/:loanId/payments',
                formato: 'JSON',
                descripcion: 'Historial de pagos paginado por préstamo',
                parametros: 'loanId (requerido), page, limit, includePending',
                estado: 'disponible'
            },
            {
                nombre: 'Resumen de Cartera',
                endpoint: '/api/reports/cartera',
                formato: 'Excel',
                descripcion: 'Todos los préstamos activos con detalles de pagos',
                parametros: 'month (opcional), year (opcional), status (opcional)',
                estado: 'disponible'
            },
            {
                nombre: 'Clientes en Mora',
                endpoint: '/api/reports/mora',
                formato: 'Excel',
                descripcion: 'Préstamos con cuotas vencidas para cobranza prioritaria',
                parametros: 'ninguno',
                estado: 'disponible'
            },
            {
                nombre: 'Mora - Resumen ligero',
                endpoint: '/api/reports/mora/overview',
                formato: 'JSON',
                descripcion: 'KPIs de mora para tableros',
                parametros: 'ninguno',
                estado: 'disponible'
            },
            {
                nombre: 'Mora - Lista paginada',
                endpoint: '/api/reports/mora/loans',
                formato: 'JSON',
                descripcion: 'Lista de préstamos en mora con prioridad',
                parametros: 'page, limit',
                estado: 'disponible'
            },
            {
                nombre: 'Mora - Cuotas vencidas por préstamo',
                endpoint: '/api/reports/mora/loan/:loanId/installments',
                formato: 'JSON',
                descripcion: 'Cuotas vencidas de un préstamo específico',
                parametros: 'loanId (requerido)',
                estado: 'disponible'
            },
            {
                nombre: 'Balance Mensual',
                endpoint: '/api/reports/balance/:month/:year',
                formato: 'Excel/PDF',
                descripcion: 'Reporte ejecutivo mensual con distribución 70/30 inversionista/admin',
                parametros: 'month (requerido), year (requerido), format=excel|pdf',
                estado: 'disponible'
            },
            {
                nombre: 'Estado de Cuenta Individual',
                endpoint: '/api/reports/cliente/:id',
                formato: 'PDF',
                descripcion: 'Historial completo de préstamos y pagos de un cliente',
                parametros: 'id (requerido)',
                estado: 'disponible'
            },
            {
                nombre: 'Recibo de Pago',
                endpoint: '/api/reports/recibo/:paymentId',
                formato: 'PDF',
                descripcion: 'Comprobante oficial de un pago registrado',
                parametros: 'paymentId (requerido)',
                estado: 'disponible'
            }
        ],
        metadata: {
            total_reportes: 12,
            disponibles: 12,
            en_desarrollo: 0
        }
    });
});

module.exports = {
    getCartera,
    getCarteraOverview,
    getCarteraLoansLight,
    getCarteraInstallmentsByLoan,
    getCarteraPaymentsByLoan,
    getMora,
    getMoraOverview,
    getMoraLoansLight,
    getMoraInstallmentsByLoan,
    getBalance,
    getClienteEstadoCuenta,
    getReciboPago,
    getAvailableReports
};
