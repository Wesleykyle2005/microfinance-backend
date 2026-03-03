process.env.TZ = 'America/Managua';

require('dotenv').config();
const app = require('./app');
const { getPrismaClient } = require('./infrastructure/database/prismaClient');
const dailyClosingScheduler = require('./jobs/schedulers/daily-closing.scheduler');
const { initScoringScheduler } = require('./jobs/schedulers/scoring.scheduler');
const { getTimezoneInfo } = require('./utils/timezone.util');
const prisma = getPrismaClient();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, async () => {
    const tzInfo = getTimezoneInfo();
    console.log('============================================');
    console.log('Microfinance Backend Server');
    console.log('============================================');
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`API Base URL: http://localhost:${PORT}/api`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Timezone: ${tzInfo.name} (${tzInfo.offset})`);
    console.log('============================================');

    try {
        await prisma.$connect();
        console.log(' Database connected successfully');
    } catch (error) {
        console.error(' Database connection failed:', error.message);
        process.exit(1);
    }

    try {
        dailyClosingScheduler.start();
        console.log('Daily closing scheduler started (8:00 AM)');
    } catch (error) {
        console.error('Daily closing scheduler failed to start:', error.message);
    }

    try {
        initScoringScheduler();
    } catch (error) {
        console.error('Scoring scheduler failed to start:', error.message);
    }

    console.log('============================================');
});

const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    try {
        dailyClosingScheduler.stop();
        console.log('Daily closing scheduler stopped');
    } catch (error) {
        console.error('Error stopping scheduler:', error.message);
    }

    server.close(async () => {
        console.log('HTTP server closed');

        try {
            await prisma.$disconnect();
            console.log('Database disconnected');
            console.log('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    });

    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('Uncaught Exception');
});

module.exports = server;
