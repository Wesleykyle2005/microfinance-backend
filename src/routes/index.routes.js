/**
 * Index Routes
 * API endpoints for index
 */
const authRoutes = require('./auth.routes');
const categoriesRoutes = require('./categories.routes');
const configRoutes = require('./config.routes');
const clientsRoutes = require('./clients.routes');
const loansRoutes = require('./loans.routes');
const pendingRoutes = require('./pending.routes');
const paymentsRoutes = require('./payments.routes');
const adminRoutes = require('./admin.routes');
const dashboardRoutes = require('./dashboard.routes');
const reportsRoutes = require('./reports.routes');

module.exports = (app) => {
    app.use('/api/auth', authRoutes);
    app.use('/api/categories', categoriesRoutes);
    app.use('/api/config', configRoutes);
    app.use('/api/clients', clientsRoutes);
    app.use('/api/loans', loansRoutes);
    app.use('/api/pending', pendingRoutes);
    app.use('/api/payments', paymentsRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/reports', reportsRoutes);
};