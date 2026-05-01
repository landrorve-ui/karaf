import { NestFactory } from '@nestjs/core';
import { MockDataModule } from './mock-data.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(MockDataModule);
}

bootstrap();
