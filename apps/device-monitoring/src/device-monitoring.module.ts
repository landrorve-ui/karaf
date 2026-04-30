import { Module } from '@nestjs/common';
import { CommonModule } from '@lib/common';
import { DeviceMonitoringController } from './device-monitoring.controller';
import { DeviceMonitoringService } from './device-monitoring.service';
import { DeviceStatusGateway } from './device-status.gateway';

@Module({
  imports: [CommonModule],
  controllers: [DeviceMonitoringController],
  providers: [DeviceMonitoringService, DeviceStatusGateway],
})
export class DeviceMonitoringModule {}
