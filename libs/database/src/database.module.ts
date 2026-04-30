import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { TelemetryRepository } from './telemetry.repository';

@Module({
  providers: [DatabaseService, TelemetryRepository],
  exports: [DatabaseService, TelemetryRepository],
})
export class DatabaseModule {}
