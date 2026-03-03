/**
 * Prisma 7 Database Configuration
 * https://pris.ly/d/config-datasource
 */

export default {
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
};
