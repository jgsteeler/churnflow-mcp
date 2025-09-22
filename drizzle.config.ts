import { defineConfig } from 'drizzle-kit';
import path from 'path';

const dbPath = process.env.CHURN_DB_PATH || './churnflow.db';

export default defineConfig({
  schema: './src/storage/schema.ts',
  out: './src/storage/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: dbPath,
  },
  verbose: true,
  strict: true,
});