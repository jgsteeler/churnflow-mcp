import { defineConfig } from 'drizzle-kit';
import path from 'path';

export default defineConfig({
  schema: './src/storage/schema.ts',
  out: './src/storage/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './churnflow.db',
  },
  verbose: true,
  strict: true,
});