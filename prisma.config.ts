import { defineConfig, env } from 'prisma/config';
import { loadLocalEnv } from './libs/common/src/env';

loadLocalEnv();

export default defineConfig({
  schema: 'libs/database/prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
