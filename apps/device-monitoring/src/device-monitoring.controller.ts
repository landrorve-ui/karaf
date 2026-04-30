import { Controller, Get } from '@nestjs/common';

@Controller()
export class DeviceMonitoringController {
  @Get()
  health(): { status: string; service: string } {
    return { status: 'ok', service: 'device-monitoring' };
  }
}
