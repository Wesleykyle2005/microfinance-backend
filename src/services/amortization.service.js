/**
 * Amortization Service
 * Servicio de cálculo de amortización personalizada
 * Método: "Interest on Opening Month Balance"
 */

class AmortizationService {
    /**
     * Calcula el calendario de pagos con lógica personalizada
     * 
     * @param {Object} params - Parámetros del préstamo
     * @param {number} params.amount - Monto del préstamo
     * @param {number} params.months - Plazo en meses
     * @param {string} params.frequency - 'MONTHLY' | 'BIWEEKLY'
     * @param {number} params.interestRate - Tasa mensual (ej: 0.20 = 20%)
     * @param {Date} params.startDate - Fecha de inicio (disbursement)
     * @returns {Array} - Array de cuotas
     */
    calculateSchedule({ amount, months, frequency, interestRate, startDate = new Date() }) {
        // Validaciones
        if (amount <= 0) throw new Error('El monto debe ser mayor a 0');
        if (months < 1 || months > 12) throw new Error('El plazo debe estar entre 1 y 12 meses');
        if (interestRate < 0 || interestRate > 1) throw new Error('La tasa de interés debe estar entre 0 y 1');

        const paymentsPerMonth = (frequency === 'BIWEEKLY') ? 2 : 1;
        const totalPayments = months * paymentsPerMonth;

        // Función helper para redondear a 2 decimales
        const round2 = (num) => Math.round(num * 100) / 100;

        // Capital constante por cuota (redondeado)
        const capitalPerPayment = round2(amount / totalPayments);

        let currentBalance = amount;
        const schedule = [];
        let paymentNumber = 1;
        let currentDate = new Date(startDate);

        // Tracking para ajuste final
        let totalCapitalAssigned = 0;
        let totalInterestAssigned = 0;

        // Iterar por cada MES
        for (let month = 1; month <= months; month++) {
            const monthlyInterest = currentBalance * interestRate;
            const interestPerPayment = round2(monthlyInterest / paymentsPerMonth);

            console.log(`[Amortization] Mes ${month}: Saldo inicial C$${Number(currentBalance).toFixed(2)}, Interés mensual C$${Number(monthlyInterest).toFixed(2)}`);

            // Crear cuotas del mes (1 o 2 según frecuencia)
            for (let paymentInMonth = 1; paymentInMonth <= paymentsPerMonth; paymentInMonth++) {
                // Calcular fecha de vencimiento
                currentDate = this.calculateDueDate(new Date(startDate), paymentNumber, frequency, months);
                const balanceAfterPayment = currentBalance - (capitalPerPayment * paymentNumber);

                // Para la última cuota, ajustar para evitar centavos perdidos
                let finalCapital = capitalPerPayment;
                let finalInterest = interestPerPayment;

                if (paymentNumber === totalPayments) {
                    // Ajustar capital para que sume exactamente el monto principal
                    finalCapital = round2(amount - totalCapitalAssigned);

                    // Ajustar interés para que sume exactamente el interés total esperado
                    // const expectedTotalInterest = round2(amount * interestRate * months);
                    // finalInterest = round2(expectedTotalInterest - totalInterestAssigned);
                    finalInterest = round2(interestPerPayment);
                    console.log(`[Amortization] Última cuota ajustada: Capital=${finalCapital}, Interés=${finalInterest}`);
                }

                totalCapitalAssigned += finalCapital;
                totalInterestAssigned += finalInterest;

                schedule.push({
                    paymentNumber,
                    month,
                    dueDate: currentDate,
                    principalDueAmount: finalCapital,
                    interestAmount: finalInterest,
                    totalDue: round2(finalCapital + finalInterest),
                    remainingAmount: round2(finalCapital + finalInterest),
                    balanceAfter: Math.max(0, balanceAfterPayment),
                    status: 'PENDING'
                });

                paymentNumber++;
            }

            // Al final del mes, reducir saldo para el siguiente mes
            currentBalance -= (capitalPerPayment * paymentsPerMonth);
        }

        // Calcular totales (ya deberían ser exactos)
        const totals = {
            totalCapital: round2(schedule.reduce((sum, p) => sum + parseFloat(p.principalDueAmount), 0)),
            totalInterest: round2(schedule.reduce((sum, p) => sum + parseFloat(p.interestAmount), 0)),
            totalAmount: round2(schedule.reduce((sum, p) => sum + parseFloat(p.totalDue), 0))
        };

        return { schedule, totals };
    }

    /**
     * Calcula la fecha de vencimiento de una cuota
     * 
     * @param {Date} startDate - Fecha de inicio (disbursement)
     * @param {number} paymentNumber - Número de cuota (1-indexed)
     * @param {string} frequency - 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY'
     * @returns {Date} - Fecha de vencimiento
     */
    calculateDueDate(startDate, paymentNumber, frequency) {
        const date = new Date(startDate);
        const originalDay = date.getDate(); // Guardar el día original para manejo de desbordamiento

        if (frequency === 'BIWEEKLY') {
            // Para pagos quincenales, simplemente sumamos días
            // First payment = +15 days (no +0 days)
            const daysToAdd = paymentNumber * 15;
            date.setDate(date.getDate() + daysToAdd);
        } else if (frequency === 'WEEKLY') {
            // Para pagos semanales
            // First payment = +7 days
            const daysToAdd = paymentNumber * 7;
            date.setDate(date.getDate() + daysToAdd);
        } else {
            // Para pagos mensuales con manejo de desbordamiento
            // First payment = +1 month (no +0 months)
            date.setMonth(date.getMonth() + paymentNumber);

            // Manejo de desbordamiento: si el día cambió (ej: 31 ene → 3 mar)
            // entonces retrocedemos al último día válido del mes anterior
            if (date.getDate() < originalDay) {
                date.setDate(0); // Último día del mes anterior
            }
        }

        return date;
    }

    /**
     * Calcula solo los totales sin generar la tabla completa
     * Útil para validaciones rápidas
     */
    calculateTotals({ amount, months, interestRate }) {
        const simple = this.calculateSchedule({
            amount,
            months,
            frequency: 'MONTHLY',
            interestRate
        });

        return simple.totals;
    }
}

module.exports = new AmortizationService();
