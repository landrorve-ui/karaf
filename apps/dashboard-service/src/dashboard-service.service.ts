import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  KafkaConsumerBase,
  KafkaProducerService,
  KAFKA_TOPICS,
  RedisService,
  TelemetryPresenceEvent,
  TelemetryTemperatureEvent,
  logOperation,
  validatePresence,
  validateTemperature,
} from '@lib/common';
import { TelemetryRepository, TelemetryType } from '@db/database';
import { ConfigService } from 'libs/common/config/config.service';

interface TemperatureQuery {
  requestId: string;
  from: Date;
  to: Date;
  deviceId?: string;
}

interface RoomUsageQuery {
  requestId: string;
  date: Date;
}

@Injectable()
export class DashboardServiceService
  extends KafkaConsumerBase
  implements OnModuleDestroy
{
  private readonly apiLogger = new Logger(DashboardServiceService.name);
  private readonly aggregateInterval: NodeJS.Timeout;

  constructor(
    private readonly telemetryRepository: TelemetryRepository,
    private readonly redis: RedisService,
    kafkaProducer: KafkaProducerService,
    private readonly configService: ConfigService,
  ) {
    super('dashboard-service', 'dashboard-service', kafkaProducer, configService);
    this.aggregateInterval = setInterval(() => {
      void this.runAggregations('timer');
    }, 60_000);
  }

  protected handlers() {
    return [
      {
        topic: KAFKA_TOPICS.telemetryTemperature,
        validate: validateTemperature,
        handle: (event: TelemetryTemperatureEvent) => this.ingestTemperature(event),
      },
      {
        topic: KAFKA_TOPICS.telemetryPresence,
        validate: validatePresence,
        handle: (event: TelemetryPresenceEvent) => this.ingestPresence(event),
      },
    ];
  }

  async ingestTemperature(event: TelemetryTemperatureEvent): Promise<void> {
    await this.telemetryRepository.storeIfNewer({
      consumer: 'dashboard-service',
      deviceId: event.deviceId,
      type: TelemetryType.temperature,
      timestamp: event.timestamp,
      value: event.value,
      payload: { value: event.value },
    });
  }

  async ingestPresence(event: TelemetryPresenceEvent): Promise<void> {
    await this.telemetryRepository.storeIfNewer({
      consumer: 'dashboard-service',
      deviceId: event.deviceId,
      type: TelemetryType.presence,
      timestamp: event.timestamp,
      roomId: event.roomId,
      payload: { roomId: event.roomId },
    });
  }

  async getTemperature(query: TemperatureQuery) {
    return logOperation(
      this.apiLogger,
      'dashboard.temperature.get',
      { requestId: query.requestId, deviceId: query.deviceId },
      async () => {
        const cacheKey = this.cacheKey('temperature', {
          from: query.from.toISOString(),
          to: query.to.toISOString(),
          deviceId: query.deviceId ?? null,
        });
        const cached = await this.redis.connection.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as unknown;
        }

        const rows = await this.telemetryRepository.getTemperatureBuckets(
          query.from,
          query.to,
          query.deviceId,
        );
        await this.redis.connection.setex(
          cacheKey,
          this.configService.dashboard.cacheTtlSeconds,
          JSON.stringify(rows),
        );
        return rows;
      },
    );
  }

  async getRoomUsage(query: RoomUsageQuery) {
    return logOperation(
      this.apiLogger,
      'dashboard.roomUsage.get',
      { requestId: query.requestId },
      async () => {
        const cacheKey = this.cacheKey('room-usage', {
          date: query.date.toISOString().slice(0, 10),
        });
        const cached = await this.redis.connection.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as unknown;
        }

        const rows = await this.telemetryRepository.getRoomUsage(query.date);
        await this.redis.connection.setex(
          cacheKey,
          this.configService.service.cacheTtlSeconds,
          JSON.stringify(rows),
        );
        return rows;
      },
    );
  }

  async runAggregations(source: string): Promise<{ temperature: number; roomUsage: number }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const startedAt = Date.now();
    const [temperature, roomUsage] = await Promise.all([
      this.telemetryRepository.aggregateTemperatureSince(since),
      this.telemetryRepository.aggregateRoomUsageSince(since),
    ]);
    this.apiLogger.log({
      operation: 'dashboard.aggregate',
      requestId: source,
      latency: Date.now() - startedAt,
      temperature,
      roomUsage,
    });
    return { temperature, roomUsage };
  }

  private cacheKey(resource: string, payload: Record<string, unknown>): string {
    const stable = Object.keys(payload)
      .sort()
      .map((key) => `${key}:${String(payload[key])}`)
      .join('|');
    return `cache:${resource}:${Buffer.from(stable).toString('base64url')}`;
  }

  override async onModuleDestroy(): Promise<void> {
    clearInterval(this.aggregateInterval);
    await super.onModuleDestroy();
  }
}
