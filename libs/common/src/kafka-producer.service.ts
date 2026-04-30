import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { getKafkaBrokers } from './env';
import { getDlqTopic, getKnownKafkaTopics } from './events';
import { ensureKafkaTopics } from './kafka-topics';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly producer: Producer;

  constructor() {
    const kafka = new Kafka({
      clientId: 'iot-producer',
      brokers: getKafkaBrokers(),
    });
    this.producer = kafka.producer();
  }

  async onModuleInit(): Promise<void> {
    const topics = getKnownKafkaTopics();
    await ensureKafkaTopics('iot-producer-admin', [
      ...topics,
      ...topics.map((topic) => getDlqTopic(topic)),
    ]);
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
