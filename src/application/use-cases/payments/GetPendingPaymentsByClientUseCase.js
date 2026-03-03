class GetPendingPaymentsByClientUseCase {
    constructor(loanRepository, paymentScheduleRepository) {
        this.loanRepository = loanRepository;
        this.paymentScheduleRepository = paymentScheduleRepository;
    }

    async execute(clientId) {
        if (!clientId || String(clientId).trim() === '') {
            throw new Error('CLIENT_ID_REQUIRED');
        }

        const loans = await this.loanRepository.findMany({
            where: {
                clientId,
                statusLoan: 'ACTIVE'
            },
            select: {
                id: true,
                folio: true,
                client: {
                    select: {
                        fullName: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (loans.length === 0) {
            return {
                groups: [],
                totalDue: 0,
                loansWithPending: 0
            };
        }

        const loanIds = loans.map((loan) => loan.id);

        const installments = await this.paymentScheduleRepository.findMany({
            where: {
                loanId: { in: loanIds },
                status: {
                    in: ['PENDING', 'PARTIAL', 'OVERDUE']
                }
            },
            select: {
                id: true,
                loanId: true,
                paymentNumber: true,
                dueDate: true,
                totalDue: true,
                paidAmount: true,
                remainingAmount: true,
                status: true
            },
            orderBy: [{ dueDate: 'asc' }, { paymentNumber: 'asc' }]
        });

        const grouped = new Map();

        loans.forEach((loan) => {
            grouped.set(loan.id, {
                loanId: loan.id,
                loanFolio: loan.folio,
                clientName: loan.client?.fullName || 'Sin cliente',
                installments: [],
                totalDue: 0
            });
        });

        installments.forEach((item) => {
            const group = grouped.get(item.loanId);
            if (!group) return;

            const parsed = {
                id: item.id,
                paymentNumber: item.paymentNumber,
                dueDate: item.dueDate,
                totalDue: Number(item.totalDue || 0),
                paidAmount: Number(item.paidAmount || 0),
                remainingAmount: Number(item.remainingAmount || 0),
                status: item.status
            };

            group.installments.push(parsed);
            group.totalDue += Math.max(0, parsed.remainingAmount);
        });

        const groups = Array.from(grouped.values())
            .filter((group) => group.installments.length > 0)
            .map((group) => ({
                ...group,
                totalDue: Number(group.totalDue.toFixed(2))
            }))
            .sort((a, b) => b.totalDue - a.totalDue);

        const totalDue = Number(
            groups.reduce((acc, group) => acc + group.totalDue, 0).toFixed(2)
        );

        return {
            groups,
            totalDue,
            loansWithPending: groups.length
        };
    }
}

module.exports = {
    GetPendingPaymentsByClientUseCase
};
