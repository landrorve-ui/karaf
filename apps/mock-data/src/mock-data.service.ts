import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { KafkaProducerService, KAFKA_TOPICS, logOperation } from '@lib/common';

interface MockDevice {
  deviceId: string;
  roomId: string;
}

@Injectable()
export class MockDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MockDataService.name);
  private readonly intervalMs = 5000;
  private readonly devices: MockDevice[] = [
    { deviceId: 'device-001', roomId: 'room-a' },
    { deviceId: 'device-002', roomId: 'room-b' },
    { deviceId: 'device-003', roomId: 'room-c' },
  ];
  private tick = 0;
  private interval?: NodeJS.Timeout;

  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  onModuleInit(): void {
    void this.publishTick();
    this.interval = setInterval(() => {
      void this.publishTick();
    }, this.intervalMs);
  }

  private async publishTick(): Promise<void> {
    const requestId = `mock-data-${Date.now()}`;
    const startedTick = this.tick;
    this.tick += 1;

    await logOperation(
      this.logger,
      'mockData.publish',
      { requestId },
      async () => {
        await Promise.all(
          this.devices.flatMap((device, index) => {
            const timestamp = Date.now();
            const temperature = this.temperatureFor(startedTick, index);

            return [
              this.kafkaProducer.emit(
                KAFKA_TOPICS.devicePing,
                device.deviceId,
                {
                  deviceId: device.deviceId,
                  timestamp,
                },
              ),
              this.kafkaProducer.emit(
                KAFKA_TOPICS.telemetryTemperature,
                device.deviceId,
                {
                  deviceId: device.deviceId,
                  value: temperature,
                  timestamp,
                },
              ),
              this.kafkaProducer.emit(
                KAFKA_TOPICS.telemetryPresence,
                device.deviceId,
                {
                  deviceId: device.deviceId,
                  roomId: device.roomId,
                  timestamp,
                },
              ),
            ];
          }),
        );
      },
    );
  }

  private temperatureFor(tick: number, index: number): number {
    const base = 20 + index * 1.7;
    const wave = Math.sin((tick + index) / 8) * 3;
    return Number((base + wave).toFixed(2));
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
