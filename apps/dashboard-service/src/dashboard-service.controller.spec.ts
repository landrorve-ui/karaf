import { Test, TestingModule } from '@nestjs/testing';
import { DashboardServiceController } from './dashboard-service.controller';
import { DashboardServiceService } from './dashboard-service.service';

describe('DashboardServiceController', () => {
  let dashboardServiceController: DashboardServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DashboardServiceController],
      providers: [
        {
          provide: DashboardServiceService,
          useValue: {
            getTemperature: jest.fn(),
            getRoomUsage: jest.fn(),
            runAggregations: jest.fn(),
          },
        },
      ],
    }).compile();

    dashboardServiceController = app.get<DashboardServiceController>(DashboardServiceController);
  });

  describe('root', () => {
    it('should return health status', () => {
      expect(dashboardServiceController.health()).toEqual({
        status: 'ok',
        service: 'dashboard-service',
      });
    });
  });
});
