import { Global, Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { KafkaProducerService } from './kafka-producer.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [CommonService, KafkaProducerService, RedisService],
  exports: [CommonService, KafkaProducerService, RedisService],
})
export class CommonModule {}
