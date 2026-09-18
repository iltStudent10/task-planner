export const appConfig = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || '',
  mongoDbName: process.env.MONGO_DB_NAME || 'policy-claims',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://localhost:8080,http://localhost:30080')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export default appConfig;
