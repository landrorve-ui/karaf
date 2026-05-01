import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, EachMessagePayload, Kafka } from 'kafkajs';
import { getDlqTopic } from './events';
import { KafkaProducerService } from './kafka-producer.service';
import { ensureKafkaTopics } from './kafka-topics';
import { ConfigService } from '../config/config.service';

export interface KafkaTopicHandler<T> {
  topic: string;
  validate: (value: unknown) => T;
  handle: (event: T, payload: EachMessagePayload) => Promise<void>;
}

export abstract class KafkaConsumerBase implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(this.constructor.name);
  private readonly consumer: Consumer;

  protected constructor(
    private readonly clientId: string,
    groupId: string,
    private readonly producer: KafkaProducerService,
    private readonly configSvc: ConfigService,
  ) {
    console.log(`kafka config: ${JSON.stringify(this.configSvc.kafka)}`);
    const kafka = new Kafka({
      clientId,
      brokers: this.configSvc.kafka.brokers,
      retry: { retries: 5 },
    });
    this.consumer = kafka.consumer({ groupId });
  }

  protected abstract handlers(): KafkaTopicHandler<unknown>[];

  async onModuleInit(): Promise<void> {
    const handlers = this.handlers();
    const topics = handlers.map((handler) => handler.topic);
    await ensureKafkaTopics(`${this.clientId}-admin`, [
      ...topics,
      ...topics.map((topic) => getDlqTopic(topic)),
    ], this.configSvc.kafka.brokers);
    await this.consumer.connect();
    for (const handler of handlers) {
      await this.consumer.subscribe({ topic: handler.topic, fromBeginning: false });
    }

    await this.consumer.run({
      eachMessage: async (payload) => {
        const handler = handlers.find((candidate) => candidate.topic === payload.topic);
        if (!handler) {
          return;
        }

        await this.handleMessage(handler, payload);
      },
    });
  }

  private async handleMessage(
    handler: KafkaTopicHandler<unknown>,
    payload: EachMessagePayload,
  ): Promise<void> {
    const startedAt = Date.now();
    const requestId = this.header(payload, 'requestId') ?? this.header(payload, 'x-request-id');
    let deviceId: string | undefined;

    try {
      const parsed = JSON.parse(payload.message.value?.toString('utf8') ?? '{}') as unknown;
      const event = handler.validate(parsed);
      if (event && typeof event === 'object' && 'deviceId' in event) {
        const candidate = (event as { deviceId?: unknown }).deviceId;
        deviceId = typeof candidate === 'string' ? candidate : undefined;
      }
      await handler.handle(event, payload);
      this.logger.log({
        operation: 'kafka.consume',
        topic: payload.topic,
        requestId,
        deviceId,
        latency: Date.now() - startedAt,
        status: 'ok',
      });
    } catch (error) {
      // this.logger.error({
      //   operation: 'kafka.consume',
      //   topic: payload.topic,
      //   requestId,
      //   deviceId,
      //   latency: Date.now() - startedAt,
      //   status: 'error',
      //   error: error instanceof Error ? error.message : String(error),
      // });
      await this.sendToDlq(payload, error);
    }
  }

  private async sendToDlq(payload: EachMessagePayload, error: unknown): Promise<void> {
    await this.producer.emit(getDlqTopic(payload.topic), payload.message.key?.toString() ?? 'unknown', {
      topic: payload.topic,
      partition: payload.partition,
      offset: payload.message.offset,
      error: error instanceof Error ? error.message : String(error),
      payload: payload.message.value?.toString('utf8') ?? null,
      timestamp: Date.now(),
    });
  }

  private header(payload: EachMessagePayload, key: string): string | undefined {
    const value = payload.message.headers?.[key];
    if (typeof value === 'string') {
      return value;
    }
    if (Buffer.isBuffer(value)) {
      return value.toString('utf8');
    }

    return undefined;
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
  }
}
