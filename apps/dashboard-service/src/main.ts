import { NestFactory } from '@nestjs/core';
import { getNumberEnv, loadLocalEnv } from '@lib/common';
import { DashboardServiceModule } from './dashboard-service.module';

async function bootstrap() {
  loadLocalEnv();
  const app = await NestFactory.create(DashboardServiceModule);
  await app.listen(getNumberEnv('DASHBOARD_SERVICE_PORT', 3002));
}
bootstrap();
