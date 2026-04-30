import { NestFactory } from '@nestjs/core';
import { getNumberEnv, loadLocalEnv } from '@lib/common';
import { DeviceMonitoringModule } from './device-monitoring.module';
import { DeviceStatusGateway } from './device-status.gateway';

async function bootstrap() {
  loadLocalEnv();
  const app = await NestFactory.create(DeviceMonitoringModule);
  await app.get(DeviceStatusGateway).bind(app.getHttpServer());
  await app.listen(getNumberEnv('DEVICE_MONITORING_PORT', 3001));
}
bootstrap();
