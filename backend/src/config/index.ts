import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 4000,
  jwt: {
    secret: process.env.JWT_SECRET || 'verdict-access-secret-key-12345',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'verdict-refresh-secret-key-67890',
    accessExpiry: '1h',
    refreshExpiry: '7d'
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'verdict',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  }
};
