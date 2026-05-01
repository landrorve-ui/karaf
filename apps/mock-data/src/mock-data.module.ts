import { Module } from '@nestjs/common';
import { CommonModule } from '@lib/common';
import { MockDataService } from './mock-data.service';

@Module({
  imports: [CommonModule],
  providers: [MockDataService],
})
export class MockDataModule {}
