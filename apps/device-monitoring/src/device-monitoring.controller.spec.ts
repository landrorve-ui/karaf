import { Test, TestingModule } from '@nestjs/testing';
import { DeviceMonitoringController } from './device-monitoring.controller';

describe('DeviceMonitoringController', () => {
  let deviceMonitoringController: DeviceMonitoringController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DeviceMonitoringController],
    }).compile();

    deviceMonitoringController = app.get<DeviceMonitoringController>(
      DeviceMonitoringController,
    );
  });

  describe('root', () => {
    it('should return health status', () => {
      expect(deviceMonitoringController.health()).toEqual({
        status: 'ok',
        service: 'device-monitoring',
      });
    });
  });
});
