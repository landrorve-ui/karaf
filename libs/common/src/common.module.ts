import { Global, Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { KafkaProducerService } from './kafka-producer.service';
import { RedisService } from './redis.service';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration';
import { ConfigService } from '../config/config.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.development.local', '.env.local', '.env'],
    }),
  ],
  providers: [CommonService, KafkaProducerService, RedisService, ConfigService],
  exports: [CommonService, KafkaProducerService, RedisService, ConfigService],
})
export class CommonModule {}
