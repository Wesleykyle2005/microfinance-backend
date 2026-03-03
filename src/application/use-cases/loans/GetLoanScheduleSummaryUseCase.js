class GetLoanScheduleSummaryUseCase {
    constructor(paymentScheduleRepository) {
        this.paymentScheduleRepository = paymentScheduleRepository;
    }

    parseLoanIds(query = {}) {
        const raw = query.loanIds;

        if (Array.isArray(raw)) {
            return raw
                .flatMap((item) => String(item).split(','))
                .map((item) => item.trim())
                .filter(Boolean);
        }

        if (typeof raw === 'string') {
            return raw
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
        }

        return [];
    }

    async execute(query = {}) {
        const loanIds = Array.from(new Set(this.parseLoanIds(query))).slice(0, 200);
        const onlyOpen = String(query.onlyOpen ?? 'true').toLowerCase() === 'true';

        if (loanIds.length === 0) {
            return {
                summaries: []
            };
        }

        const where = {
            loanId: {
                in: loanIds
            },
            ...(onlyOpen
                ? {
                    status: {
                        in: ['PENDING', 'PARTIAL', 'OVERDUE']
                    }
                }
                : {})
        };

        const rows = await this.paymentScheduleRepository.findMany({
            where,
            select: {
                id: true,
                loanId: true,
                paymentNumber: true,
                dueDate: true,
                principalDueAmount: true,
                interestAmount: true,
                totalDue: true,
                paidAmount: true,
                remainingAmount: true,
                status: true
            },
            orderBy: [{ dueDate: 'asc' }, { paymentNumber: 'asc' }]
        });

        const grouped = new Map();
        loanIds.forEach((loanId) => grouped.set(loanId, []));

        rows.forEach((row) => {
            const parsed = {
                id: row.id,
                paymentNumber: row.paymentNumber,
                dueDate: row.dueDate,
                principalDueAmount: Number(row.principalDueAmount || 0),
                interestAmount: Number(row.interestAmount || 0),
                totalDue: Number(row.totalDue || 0),
                paidAmount: Number(row.paidAmount || 0),
                remainingAmount: Number(row.remainingAmount || 0),
                status: row.status
            };

            grouped.get(row.loanId)?.push(parsed);
        });

        const summaries = Array.from(grouped.entries()).map(([loanId, installments]) => {
            const sorted = [...installments].sort((a, b) => {
                const aDate = new Date(a.dueDate).getTime();
                const bDate = new Date(b.dueDate).getTime();
                return aDate - bDate || a.paymentNumber - b.paymentNumber;
            });

            const nextPayment = sorted[0] || null;
            const totalRemaining = sorted.reduce(
                (acc, item) => acc + Math.max(0, Number(item.remainingAmount || 0)),
                0
            );

            return {
                loanId,
                installments: sorted,
                nextPayment,
                totalRemaining: Number(totalRemaining.toFixed(2))
            };
        });

        return {
            summaries
        };
    }
}

module.exports = {
    GetLoanScheduleSummaryUseCase
};
