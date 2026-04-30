import { Module } from '@nestjs/common';
import { CommonModule } from '@lib/common';
import { DatabaseModule } from '@db/database';
import { DashboardServiceController } from './dashboard-service.controller';
import { DashboardServiceService } from './dashboard-service.service';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [DashboardServiceController],
  providers: [DashboardServiceService],
})
export class DashboardServiceModule {}
