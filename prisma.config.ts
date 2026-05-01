import { defineConfig, env } from 'prisma/config';
import dotenv from 'dotenv';
dotenv.config({
  path: ['.env', '.env.local', `.env.${process.env.NODE_ENV}`],
});

console.log('DATABASE_URL:',  process.env.DATABASE_URL);

export default defineConfig({
  schema: 'libs/database/prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
