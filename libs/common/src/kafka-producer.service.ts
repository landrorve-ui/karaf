import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { getDlqTopic, getKnownKafkaTopics } from './events';
import { ensureKafkaTopics } from './kafka-topics';
import { ConfigService } from '../config/config.service';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly producer: Producer;

  constructor(private readonly configService: ConfigService) {
    const kafka = new Kafka({
      clientId: 'iot-producer',
      brokers: this.configService.kafka.brokers,
    });
    this.producer = kafka.producer();
  }

  async onModuleInit(): Promise<void> {
    const topics = getKnownKafkaTopics();
    await ensureKafkaTopics('iot-producer-admin', [
      ...topics,
      ...topics.map((topic) => getDlqTopic(topic)),
    ], this.configService.kafka.brokers);
    await this.producer.connect();
  }

  async emit(topic: string, key: string, value: unknown): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(value) }],
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.producer.disconnect();
    } catch (error) {
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }
}
