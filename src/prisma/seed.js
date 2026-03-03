const prisma = require("./client");
const { randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");

const pick = (items) => items[Math.floor(Math.random() * items.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDecimal = (min, max, decimals = 2) =>
    (Math.random() * (max - min) + min).toFixed(decimals);

const addDays = (base, days) => {
    const date = new Date(base);
    date.setDate(date.getDate() + days);
    return date;
};

const addMonths = (base, months) => {
    const date = new Date(base);
    date.setMonth(date.getMonth() + months);
    return date;
};

async function main() {
    console.log("🌱 Iniciando seed de la base de datos...");

    // Limpiar base de datos en orden correcto (respetando foreign keys)
    await prisma.notificationLog.deleteMany();
    await prisma.whatsappNotification.deleteMany();
    await prisma.document.deleteMany();
    await prisma.moraApplicationLog.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.paymentSchedule.deleteMany();
    await prisma.loanRepaymentPlan.deleteMany();
    await prisma.loan.deleteMany();
    await prisma.disbursement.deleteMany();
    await prisma.scoringHistory.deleteMany();
    await prisma.clientCategoryTransition.deleteMany();
    await prisma.clientProfile.deleteMany();
    await prisma.clientCategory.deleteMany();
    await prisma.balanceSnapshot.deleteMany();
    await prisma.configurationHistory.deleteMany();
    await prisma.systemConfig.deleteMany();
    await prisma.dailyClosingLog.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.superAdminProfile.deleteMany();
    await prisma.user.deleteMany();

    console.log("Base de datos limpiada");

    // ==========================================
    // 1. USUARIOS
    // ==========================================

    // Hash para contraseña "123" (para admin)
    const adminPasswordHash = await bcrypt.hash("123", 10);

    // Hash para contraseña "Demo123!" (para otros usuarios)
    const defaultPasswordHash = await bcrypt.hash("Demo123!", 10);

    const users = [
        // Usuario Admin principal con contraseña "123"
        {
            id: randomUUID(),
            email: "admin@microfinance.com",
            passwordHash: adminPasswordHash,
            role: "SUPER_ADMIN",
            isActive: true,
            lastLogin: new Date(),
        },
        // Usuarios adicionales con contraseña "Demo123!"
        ...Array.from({ length: 10 }, (_, index) => {
            const role = index < 3 ? "ADMIN" : "COBRADOR";
            return {
                id: randomUUID(),
                email: `user${index + 1}@empresa.com`,
                passwordHash: defaultPasswordHash,
                role,
                isActive: Math.random() > 0.1,
                lastLogin: Math.random() > 0.3 ? addDays(new Date(), -randomInt(1, 30)) : null,
            };
        }),
    ];

    await prisma.user.createMany({ data: users });
    const superAdminUser = users[0];

    console.log("Usuarios creados");
    console.log("   Admin: admin@microfinance.com");
    console.log("   Password: 123");

    // Perfil del Super Admin
    await prisma.superAdminProfile.create({
        data: {
            id: randomUUID(),
            userId: superAdminUser.id,
            legalName: "Administrador Principal - Microfinanciera",
            taxId: "J-0012345678-9",
            whatsappNumber: "+50588887777",
            whatsappNotificationsEnabled: true,
            notificationEmail: "admin@microfinance.com",
        },
    });

    // ==========================================
    // 2. CATEGORÍAS DE CLIENTES
    // ==========================================

    const categories = [
        {
            id: randomUUID(),
            name: "PLATINUM",
            displayName: "Platinum",
            description: "Clientes VIP con historial impecable",
            minScore: 90,
            maxScore: 100,
            creditMultiplier: "2.00",
            approvalType: "AUTOMATIC",
            colorHex: "#E5E4E2",
            iconName: "crown",
            priorityOrder: 1,
            isActive: true,
        },
        {
            id: randomUUID(),
            name: "GOLD",
            displayName: "Gold",
            description: "Clientes con excelente comportamiento de pago",
            minScore: 80,
            maxScore: 89,
            creditMultiplier: "1.50",
            approvalType: "AUTOMATIC",
            colorHex: "#FFD700",
            iconName: "star",
            priorityOrder: 2,
            isActive: true,
        },
        {
            id: randomUUID(),
            name: "STANDARD",
            displayName: "Estándar",
            description: "Clientes con perfil crediticio promedio",
            minScore: 60,
            maxScore: 79,
            creditMultiplier: "1.00",
            approvalType: "AUTOMATIC",
            colorHex: "#C0C0C0",
            iconName: "user",
            priorityOrder: 3,
            isActive: true,
        },
        {
            id: randomUUID(),
            name: "RISK",
            displayName: "Riesgo",
            description: "Clientes con historial de pagos irregulares",
            minScore: 40,
            maxScore: 59,
            creditMultiplier: "0.70",
            approvalType: "MANUAL",
            colorHex: "#FFA500",
            iconName: "alert-triangle",
            priorityOrder: 4,
            isActive: true,
        },
        {
            id: randomUUID(),
            name: "BLOCKED",
            displayName: "Bloqueado",
            description: "Sin acceso a crédito por incumplimiento",
            minScore: 0,
            maxScore: 39,
            creditMultiplier: "0.00",
            approvalType: "BLOCKED",
            colorHex: "#DC3545",
            iconName: "ban",
            priorityOrder: 5,
            isActive: true,
        },
    ];

    await prisma.clientCategory.createMany({ data: categories });
    console.log("Categorías de clientes creadas (5)");

    // ==========================================
    // 3. CONFIGURACIÓN DEL SISTEMA
    // ==========================================

    const systemConfigId = randomUUID();
    await prisma.systemConfig.create({
        data: {
            id: systemConfigId,
            defaultInterestRate: "3.50",
            defaultLateFeeRate: "1.50",
            exchangeRateNioUsd: "36.7500",
            moraCalculationType: "DAILY",
            moraEnabled: true,
            notificationsEnabled: true,
            notificationMode: "MANUAL",
            investorSharePercentage: "70.00", // 70/30 split
            adminSharePercentage: "30.00",
            updatedBy: superAdminUser.id,
        },
    });

    console.log("Configuración del sistema creada");

    // ==========================================
    // 4. CLIENTES
    // ==========================================

    const adminUsers = users.filter((user) => user.role !== "COBRADOR");
    const collectors = users.filter((user) => user.role === "COBRADOR");

    const clientNames = [
        "Juan Pérez Martínez", "María López García", "Carlos Rodríguez Sánchez",
        "Ana Torres Ramírez", "Pedro González Fernández", "Luisa Hernández Morales",
        "José Díaz Castro", "Carmen Ruiz Ortiz", "Francisco Moreno Delgado",
        "Elena Jiménez Navarro", "Miguel Álvarez Romero", "Rosa Gómez Suárez",
        "Antonio Martín Gil", "Isabel Sánchez Rubio", "Manuel Fernández Vega",
        "Sofía Castro Molina", "Rafael Vargas Ortega", "Laura Ramos Serrano",
        "Diego Romero Medina", "Patricia Muñoz Cortés", "Javier Iglesias Peña",
        "Beatriz Delgado Gallego", "Andrés Ortiz Vázquez", "Cristina Marín Aguilar",
        "Fernando Rubio Santana", "Gabriela Serrano Pascual", "Roberto Gil Núñez",
        "Verónica Navarro Campos", "Alberto Molina Herrera", "Claudia Cortés Guerrero",
    ];

    const cities = ["Managua", "León", "Granada", "Masaya", "Matagalpa", "Estelí", "Jinotega", "Chinandega"];
    const businessTypes = ["Pulpería", "Tienda de ropa", "Ferretería", "Restaurante", "Cafetería", "Panadería", "Farmacia", "Sastrería"];

    const clients = clientNames.map((fullName, index) => {
        const category = pick(categories.filter(c => c.name !== "BLOCKED")); // La mayoría no bloqueados
        const scoringPoints = randomInt(category.minScore, category.maxScore);

        return {
            id: randomUUID(),
            fullName,
            identificationNumber: `001-${String(230124 + index).padStart(6, '0')}-${String(randomInt(1000, 9999)).padStart(4, '0')}X`,
            phoneNumber: `+505 8${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
            secondaryPhone: Math.random() > 0.6 ? `+505 8${randomInt(100, 999)}-${randomInt(1000, 9999)}` : null,
            email: Math.random() > 0.3 ? `${fullName.split(' ')[0].toLowerCase()}${index}@correo.com` : null,
            businessName: Math.random() > 0.4 ? `${pick(businessTypes)} ${fullName.split(' ')[0]}` : null,
            businessType: pick(businessTypes),
            address: `Barrio ${pick(["Monseñor Lezcano", "Martha Quezada", "Bello Horizonte", "Los Robles"])}, ${randomInt(1, 200)} varas al ${pick(["norte", "sur", "este", "oeste"])}`,
            city: pick(cities),
            monthlyIncome: randomDecimal(5000, 25000), // NIO
            scoringPoints,
            categoryId: category.id,
            isCreditBlocked: category.approvalType === "BLOCKED",
            isActive: true,
            createdBy: pick(adminUsers).id,
        };
    });

    await prisma.clientProfile.createMany({ data: clients });
    console.log(`Clientes creados (${clients.length})`);

    // ==========================================
    // 5. DESEMBOLSOS
    // ==========================================

    const disbursements = Array.from({ length: 25 }, (_, index) => ({
        id: randomUUID(),
        folio: `DSB-2026-${String(1001 + index).padStart(5, '0')}`,
        amount: randomDecimal(1000, 50000),
        currency: "NIO",
        disbursedAt: addDays(new Date(), -randomInt(5, 90)),
        createdBy: pick(adminUsers).id,
        notes: index % 3 === 0 ? "Desembolso por transferencia bancaria" : null,
    }));

    await prisma.disbursement.createMany({ data: disbursements });
    console.log(`Desembolsos creados (${disbursements.length})`);

    // ==========================================
    // 6. PRÉSTAMOS (con datos realistas para reportes)
    // ==========================================

    const loans = [];

    // Préstamos ACTIVOS con pagos parciales (para reporte de cartera)
    for (let i = 0; i < 15; i++) {
        const client = pick(clients);
        const principal = parseFloat(randomDecimal(2000, 15000));
        const interestRate = 3.5;
        const lateFeeRate = 1.5;
        const termDays = 90; // 3 meses
        const interestTotal = (principal * (interestRate / 100) * (termDays / 30)).toFixed(2);
        const totalAmount = (principal + parseFloat(interestTotal)).toFixed(2);
        const disbursementDate = addDays(new Date(), -randomInt(30, 60));

        // Simular que han pagado entre 30% y 70% del préstamo
        const paymentProgress = Math.random() * 0.4 + 0.3; // 0.3 a 0.7
        const totalPaid = parseFloat((parseFloat(totalAmount) * paymentProgress).toFixed(2));
        const principalPaid = parseFloat((parseFloat(principal) * paymentProgress).toFixed(2));
        const interestPaid = parseFloat((parseFloat(interestTotal) * paymentProgress).toFixed(2));

        loans.push({
            id: randomUUID(),
            folio: `PR-2026-${String(10001 + i).padStart(5, '0')}`,
            clientId: client.id,
            collectorId: collectors.length ? pick(collectors).id : null,
            principalAmount: principal.toFixed(2),
            approvedAmount: principal.toFixed(2),
            interestRate: interestRate.toFixed(2),
            lateFeeRate: lateFeeRate.toFixed(2),
            interestTotal,
            lateFeesAccrued: "0.00",
            totalAmount,
            principalPaid: principalPaid.toFixed(2),
            interestPaid: interestPaid.toFixed(2),
            lateFeesPaid: "0.00",
            remainingBalance: (parseFloat(totalAmount) - totalPaid).toFixed(2),
            termDays,
            frequency: "MONTHLY",
            currency: "NIO",
            statusLoan: "ACTIVE",
            approvalDate: addDays(disbursementDate, -2),
            disbursementDate,
            maturityDate: addDays(disbursementDate, termDays),
            disbursementId: pick(disbursements).id,
            createdBy: pick(adminUsers).id,
        });
    }

    // Préstamos ACTIVOS CON MORA (para reporte de mora)
    for (let i = 0; i < 8; i++) {
        const client = pick(clients);
        const principal = parseFloat(randomDecimal(1500, 8000));
        const interestRate = 3.5;
        const lateFeeRate = 1.5;
        const termDays = 90;
        const interestTotal = (principal * (interestRate / 100) * (termDays / 30)).toFixed(2);
        const totalAmount = (principal + parseFloat(interestTotal)).toFixed(2);
        const disbursementDate = addDays(new Date(), -randomInt(60, 90)); // Más antiguos

        // Estos tienen mora acumulada
        const daysOverdue = randomInt(5, 45);
        const moraAccrued = parseFloat(randomDecimal(50, 300));

        loans.push({
            id: randomUUID(),
            folio: `PR-2026-${String(10016 + i).padStart(5, '0')}`,
            clientId: client.id,
            collectorId: collectors.length ? pick(collectors).id : null,
            principalAmount: principal.toFixed(2),
            approvedAmount: principal.toFixed(2),
            interestRate: interestRate.toFixed(2),
            lateFeeRate: lateFeeRate.toFixed(2),
            interestTotal,
            lateFeesAccrued: moraAccrued.toFixed(2),
            totalAmount,
            principalPaid: (principal * 0.2).toFixed(2), // Solo 20% pagado
            interestPaid: (parseFloat(interestTotal) * 0.2).toFixed(2),
            lateFeesPaid: "0.00",
            remainingBalance: (parseFloat(totalAmount) - (principal * 0.2) - (parseFloat(interestTotal) * 0.2)).toFixed(2),
            termDays,
            frequency: "MONTHLY",
            currency: "NIO",
            statusLoan: "ACTIVE",
            approvalDate: addDays(disbursementDate, -2),
            disbursementDate,
            maturityDate: addDays(disbursementDate, termDays),
            disbursementId: pick(disbursements).id,
            createdBy: pick(adminUsers).id,
        });
    }

    // Préstamos PAGADOS COMPLETAMENTE
    for (let i = 0; i < 5; i++) {
        const client = pick(clients);
        const principal = parseFloat(randomDecimal(1000, 5000));
        const interestRate = 3.5;
        const lateFeeRate = 1.5;
        const termDays = 60;
        const interestTotal = (principal * (interestRate / 100) * (termDays / 30)).toFixed(2);
        const totalAmount = (principal + parseFloat(interestTotal)).toFixed(2);
        const disbursementDate = addDays(new Date(), -randomInt(90, 180));

        loans.push({
            id: randomUUID(),
            folio: `PR-2026-${String(10024 + i).padStart(5, '0')}`,
            clientId: client.id,
            collectorId: collectors.length ? pick(collectors).id : null,
            principalAmount: principal.toFixed(2),
            approvedAmount: principal.toFixed(2),
            interestRate: interestRate.toFixed(2),
            lateFeeRate: lateFeeRate.toFixed(2),
            interestTotal,
            lateFeesAccrued: "0.00",
            totalAmount,
            principalPaid: principal.toFixed(2),
            interestPaid: interestTotal,
            lateFeesPaid: "0.00",
            remainingBalance: "0.00",
            termDays,
            frequency: "MONTHLY",
            currency: "NIO",
            statusLoan: "PAID_OFF",
            approvalDate: addDays(disbursementDate, -2),
            disbursementDate,
            maturityDate: addDays(disbursementDate, termDays),
            disbursementId: pick(disbursements).id,
            createdBy: pick(adminUsers).id,
        });
    }

    // Préstamos PENDIENTES de aprobación
    for (let i = 0; i < 3; i++) {
        const client = pick(clients);
        const principal = parseFloat(randomDecimal(3000, 10000));
        const interestRate = 3.5;
        const lateFeeRate = 1.5;
        const termDays = 90;
        const interestTotal = (principal * (interestRate / 100) * (termDays / 30)).toFixed(2);
        const totalAmount = (principal + parseFloat(interestTotal)).toFixed(2);

        loans.push({
            id: randomUUID(),
            folio: `PR-2026-${String(10029 + i).padStart(5, '0')}`,
            clientId: client.id,
            collectorId: null,
            principalAmount: principal.toFixed(2),
            approvedAmount: principal.toFixed(2),
            interestRate: interestRate.toFixed(2),
            lateFeeRate: lateFeeRate.toFixed(2),
            interestTotal,
            lateFeesAccrued: "0.00",
            totalAmount,
            principalPaid: "0.00",
            interestPaid: "0.00",
            lateFeesPaid: "0.00",
            remainingBalance: totalAmount,
            termDays,
            frequency: "MONTHLY",
            currency: "NIO",
            statusLoan: "PENDING",
            approvalDate: null,
            disbursementDate: null,
            maturityDate: null,
            disbursementId: null,
            createdBy: pick(adminUsers).id,
        });
    }

    await prisma.loan.createMany({ data: loans });
    console.log(`Préstamos creados (${loans.length})`);

    // ==========================================
    // 7. CRONOGRAMAS DE PAGO
    // ==========================================

    const paymentSchedules = [];

    loans.filter(l => l.statusLoan !== "PENDING").forEach((loan) => {
        const installments = 3; // 3 cuotas mensuales
        const principalPer = (parseFloat(loan.principalAmount) / installments).toFixed(2);
        const interestPer = (parseFloat(loan.interestTotal) / installments).toFixed(2);

        for (let i = 0; i < installments; i++) {
            const totalDue = (parseFloat(principalPer) + parseFloat(interestPer)).toFixed(2);
            const dueDate = addMonths(new Date(loan.disbursementDate), i + 1);

            // Determinar estado según el loan
            let status, paidAmount, paidDate, lateFeeAmount, moraAmount;

            if (loan.statusLoan === "PAID_OFF") {
                // Todos pagados
                status = "PAID";
                paidAmount = totalDue;
                paidDate = addDays(dueDate, randomInt(-5, 5));
                lateFeeAmount = "0.00";
                moraAmount = 0;
            } else if (loan.statusLoan === "ACTIVE") {
                // Ver si tiene mora
                const hasMora = parseFloat(loan.lateFeesAccrued) > 0;

                if (hasMora && i === 0) {
                    // Primera cuota vencida con mora
                    status = "OVERDUE";
                    paidAmount = "0.00";
                    paidDate = null;
                    lateFeeAmount = (parseFloat(loan.lateFeesAccrued) / 2).toFixed(2);
                    moraAmount = randomInt(10, 45); // días de atraso
                } else if (i === 0) {
                    // Primera cuota pagada
                    status = "PAID";
                    paidAmount = totalDue;
                    paidDate = addDays(dueDate, randomInt(-3, 3));
                    lateFeeAmount = "0.00";
                    moraAmount = 0;
                } else if (i === 1 && hasMora) {
                    // Segunda cuota vencida
                    status = "OVERDUE";
                    paidAmount = "0.00";
                    paidDate = null;
                    lateFeeAmount = (parseFloat(loan.lateFeesAccrued) / 2).toFixed(2);
                    moraAmount = randomInt(5, 20);
                } else {
                    // Cuotas pendientes
                    status = "PENDING";
                    paidAmount = "0.00";
                    paidDate = null;
                    lateFeeAmount = "0.00";
                    moraAmount = 0;
                }
            }

            paymentSchedules.push({
                id: randomUUID(),
                loanId: loan.id,
                paymentNumber: i + 1,
                dueDate,
                principalDueAmount: principalPer,
                interestAmount: interestPer,
                lateFeeAmount: lateFeeAmount || "0.00",
                totalDue,
                paidAmount: paidAmount || "0.00",
                remainingAmount: (parseFloat(totalDue) - parseFloat(paidAmount || "0")).toFixed(2),
                status,
                paidDate,
            });
        }
    });

    await prisma.paymentSchedule.createMany({ data: paymentSchedules });
    console.log(`Cronogramas de pago creados (${paymentSchedules.length} cuotas)`);

    // ==========================================
    // 8. PAGOS (con breakdown completo)
    // ==========================================

    const payments = [];

    // Crear pagos para préstamos activos y pagados
    loans.filter(l => l.statusLoan !== "PENDING").forEach((loan) => {
        const totalPaidLoan = parseFloat(loan.principalPaid) + parseFloat(loan.interestPaid) + parseFloat(loan.lateFeesPaid);

        if (totalPaidLoan > 0) {
            // Crear entre 1 y 3 pagos
            const numPayments = loan.statusLoan === "PAID_OFF" ? 3 : randomInt(1, 2);

            for (let i = 0; i < numPayments; i++) {
                const paymentAmount = (totalPaidLoan / numPayments).toFixed(2);
                const principalPortion = (parseFloat(loan.principalPaid) / numPayments).toFixed(2);
                const interestPortion = (parseFloat(loan.interestPaid) / numPayments).toFixed(2);
                const lateFeePortion = (parseFloat(loan.lateFeesPaid) / numPayments).toFixed(2);

                payments.push({
                    id: randomUUID(),
                    loanId: loan.id,
                    amount: paymentAmount,
                    principalPaid: principalPortion,
                    interestPaid: interestPortion,
                    lateFeePaid: lateFeePortion,
                    paymentDate: addDays(new Date(loan.disbursementDate), randomInt(10 + (i * 30), 25 + (i * 30))),
                    paymentMethod: pick(["CASH", "TRANSFER", "MOBILE_MONEY"]),
                    voucherPhotoUrl: Math.random() > 0.6 ? `https://storage.microfinance.com/vouchers/${randomUUID()}.jpg` : null,
                    receiptPdfUrl: null,
                    receiptFolio: `RCPT-${String(randomInt(50000, 99999))}`,
                    notes: i === 0 ? "Primer pago del préstamo" : null,
                    status: "CONFIRMED",
                    createdBy: pick(adminUsers).id,
                });
            }
        }
    });

    await prisma.payment.createMany({ data: payments });
    console.log(`Pagos creados (${payments.length})`);

    // ==========================================
    // 9. LOGS DE MORA
    // ==========================================

    const moraLogs = [];

    // Crear logs de mora para las cuotas OVERDUE
    paymentSchedules.filter(ps => ps.status === "OVERDUE").forEach((schedule) => {
        const daysOverdue = Math.floor((new Date() - new Date(schedule.dueDate)) / (1000 * 60 * 60 * 24));
        const dailyRate = parseFloat(randomDecimal(0.0001, 0.0050, 4));

        moraLogs.push({
            id: randomUUID(),
            installmentId: schedule.id,
            loanId: schedule.loanId,
            moraAmountApplied: schedule.lateFeeAmount,
            dailyRate: dailyRate.toFixed(4),
            daysOverdue: Math.max(daysOverdue, 1),
            applicationType: "DAILY",
            appliedAt: addDays(new Date(schedule.dueDate), 1),
            appliedByUserId: null, // Sistema automático
            notes: "Aplicación automática de mora por vencimiento",
        });
    });

    await prisma.moraApplicationLog.createMany({ data: moraLogs });
    console.log(`Logs de mora creados (${moraLogs.length})`);

    // ==========================================
    // 10. SNAPSHOTS DE BALANCE MENSUAL
    // ==========================================

    const balanceSnapshots = [];

    // Últimos 12 meses
    for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - i);

        const principalRecovered = parseFloat(randomDecimal(8000, 25000));
        const interestCollected = parseFloat(randomDecimal(1500, 5000));
        const lateFeesCollected = parseFloat(randomDecimal(100, 800));
        const totalRevenue = principalRecovered + interestCollected + lateFeesCollected;

        // Distribución 70/30
        const investorShare = (totalRevenue * 0.70).toFixed(2);
        const adminShare = (totalRevenue * 0.30).toFixed(2);

        balanceSnapshots.push({
            id: randomUUID(),
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            totalPrincipalRecovered: principalRecovered.toFixed(2),
            totalInterestCollected: interestCollected.toFixed(2),
            totalLateFeesCollected: lateFeesCollected.toFixed(2),
            totalPrincipalOutstanding: randomDecimal(35000, 85000),
            investorShare,
            adminShare,
            exchangeRateApplied: "36.7500",
            generatedBy: superAdminUser.id,
            notes: `Cierre mensual automático - ${date.toLocaleDateString('es-NI', { month: 'long', year: 'numeric' })}`,
        });
    }

    await prisma.balanceSnapshot.createMany({ data: balanceSnapshots });
    console.log(`Snapshots de balance creados (${balanceSnapshots.length})`);

    // ==========================================
    // 11. LOGS DE CIERRE DIARIO
    // ==========================================

    const dailyClosings = Array.from({ length: 30 }, (_, index) => ({
        id: randomUUID(),
        executedAt: addDays(new Date(), -index),
        executedBy: "SYSTEM_AUTO",
        processedCount: randomInt(20, 35),
        clientsAffected: randomInt(5, 15),
        moraEnabled: true,
        notificationsEnabled: true,
        notificationMode: "MANUAL",
        totalMoraApplied: randomDecimal(50, 400),
        notificationsSent: randomInt(3, 12),
        notificationsFailed: randomInt(0, 2),
        success: true,
        errorMessage: null,
        executionDate: addDays(new Date(), -index),
    }));

    await prisma.dailyClosingLog.createMany({ data: dailyClosings });
    console.log(`Logs de cierre diario creados (${dailyClosings.length})`);

    // ==========================================
    // 12. HISTORIAL DE SCORING
    // ==========================================

    const scoringHistory = clients.flatMap((client) => {
        // 2-5 cambios de scoring por cliente
        const numChanges = randomInt(2, 5);
        return Array.from({ length: numChanges }, (_, i) => ({
            id: randomUUID(),
            clientId: client.id,
            pointsChange: randomInt(-15, 20),
            newTotalPoints: randomInt(50, 95),
            reason: pick([
                "Pago puntual de cuota",
                "Préstamo completado exitosamente",
                "Pago atrasado aplicado",
                "Ajuste manual por comportamiento",
            ]),
            triggerLoanId: Math.random() > 0.4 ? pick(loans.filter(l => l.clientId === client.id))?.id : null,
            triggeredAt: addDays(new Date(), -randomInt(10, 120)),
        }));
    });

    await prisma.scoringHistory.createMany({ data: scoringHistory.filter(s => s !== undefined) });
    console.log(`Historial de scoring creado (${scoringHistory.length})`);

    // ==========================================
    // RESUMEN FINAL
    // ==========================================

    console.log("\nSeed completado exitosamente\n");
    console.log("RESUMEN DE DATOS CREADOS:");
    console.log("================================");
    console.log(`   Usuarios: ${users.length}`);
    console.log(`   Categorías: ${categories.length}`);
    console.log(`   Clientes: ${clients.length}`);
    console.log(`   Préstamos: ${loans.length}`);
    console.log(`      - ACTIVE: ${loans.filter(l => l.statusLoan === "ACTIVE").length}`);
    console.log(`      - PAID_OFF: ${loans.filter(l => l.statusLoan === "PAID_OFF").length}`);
    console.log(`      - PENDING: ${loans.filter(l => l.statusLoan === "PENDING").length}`);
    console.log(`   Cuotas: ${paymentSchedules.length}`);
    console.log(`   Pagos: ${payments.length}`);
    console.log(`   Logs de mora: ${moraLogs.length}`);
    console.log(`   Balance snapshots: ${balanceSnapshots.length}`);
    console.log("================================\n");
    console.log("CREDENCIALES DE ACCESO:");
    console.log("   Email: admin@microfinance.com");
    console.log("   Password: 123");
    console.log("================================\n");
}

main()
    .catch((error) => {
        console.error("Error al ejecutar seed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
