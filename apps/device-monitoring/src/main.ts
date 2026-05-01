import { NestFactory } from '@nestjs/core';
import { DeviceMonitoringModule } from './device-monitoring.module';
import { DeviceStatusGateway } from './device-status.gateway';

async function bootstrap() {
  const app = await NestFactory.create(DeviceMonitoringModule);
  await app.get(DeviceStatusGateway).bind(app.getHttpServer());
  await app.listen(3001);
}
bootstrap();
