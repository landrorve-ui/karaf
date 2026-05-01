import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  DEVICE_STATUS_CHANNEL,
  DevicePingEvent,
  DeviceStatusEvent,
  KafkaConsumerBase,
  KafkaProducerService,
  KAFKA_TOPICS,
  RedisService,
  validateDevicePing,
} from '@lib/common';
import { ConfigService } from 'libs/common/config/config.service';

@Injectable()
export class DeviceMonitoringService
  extends KafkaConsumerBase
  implements OnModuleDestroy
{
  private readonly staleSetKey = 'devices:lastSeen';
  private readonly offlineSetKey = 'devices:offlineEmitted';
  private readonly interval: NodeJS.Timeout;

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly configService: ConfigService,
  ) {
    super('device-monitoring', 'device-monitoring', kafkaProducer, configService);
    this.interval = setInterval(() => {
      void this.emitOfflineDevices();
    }, 5_000);
  }

  protected handlers() {
    return [
      {
        topic: KAFKA_TOPICS.devicePing,
        validate: validateDevicePing,
        handle: (event: DevicePingEvent) => this.handlePing(event),
      },
    ];
  }

  async handlePing(event: DevicePingEvent): Promise<void> {
    const key = this.deviceKey(event.deviceId);
    const stored = await this.redis.connection.get(key);
    if (stored && event.timestamp <= Number(stored)) {
      return;
    }

      await this.redis.connection
        .multi()
        .set(key, String(event.timestamp), 'EX', this.configService.device.statusTtlSeconds)
        .zadd(this.staleSetKey, event.timestamp, event.deviceId)
        .srem(this.offlineSetKey, event.deviceId)
        .exec();

    await this.emitStatus({
      deviceId: event.deviceId,
      timestamp: event.timestamp,
      status: 'online',
    });
  }

  private async emitOfflineDevices(): Promise<void> {
    const cutoff = Date.now() - this.configService.device.statusTtlSeconds * 1000;
    const deviceIds = await this.redis.connection.zrangebyscore(
      this.staleSetKey,
      0,
      cutoff,
      'LIMIT',
      0,
      100,
    );

    for (const deviceId of deviceIds) {
      const lastSeen = await this.redis.connection.get(this.deviceKey(deviceId));
      if (lastSeen && Number(lastSeen) > cutoff) {
        continue;
      }

      const firstOfflineEmission = await this.redis.connection.sadd(
        this.offlineSetKey,
        deviceId,
      );

      await this.redis.connection.zrem(this.staleSetKey, deviceId);
      if (firstOfflineEmission === 0) {
        continue;
      }

      await this.emitStatus({
        deviceId,
        timestamp: Date.now(),
        status: 'offline',
      });
    }
  }

  private async emitStatus(event: DeviceStatusEvent): Promise<void> {
    const topic =
      event.status === 'online'
        ? KAFKA_TOPICS.deviceOnline
        : KAFKA_TOPICS.deviceOffline;

    await this.kafkaProducer.emit(topic, event.deviceId, {
      deviceId: event.deviceId,
      timestamp: event.timestamp,
    });
    await this.redis.connection.publish(DEVICE_STATUS_CHANNEL, JSON.stringify(event));
  }

  private deviceKey(deviceId: string): string {
    return `device:${deviceId}`;
  }

  override async onModuleDestroy(): Promise<void> {
    clearInterval(this.interval);
    await super.onModuleDestroy();
  }
}
