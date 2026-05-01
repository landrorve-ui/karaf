import { Injectable } from "@nestjs/common";
import { ConfigService as NestConfigService } from "@nestjs/config";

interface DBConfig {
    url: string;
}

interface KafkaConfig {
    brokers: string[];
}

interface RedisConfig {
    url: string;
}

interface DeviceConfig {
    statusTtlSeconds: number;
}

interface ServiceConfig {
    cacheTtlSeconds: number;
    deviceMonitoringPort: number;
    dashboardServicePort: number;
}

interface AppConfig {
    database: DBConfig;
    kafka: KafkaConfig;
    redis: RedisConfig;
    device: DeviceConfig;
    service: ServiceConfig;
}

@Injectable()
export class ConfigService  implements AppConfig {
    public readonly database: DBConfig;
    public readonly kafka: KafkaConfig;
    public readonly redis: RedisConfig;
    public readonly device: DeviceConfig;
    public readonly service: ServiceConfig;

    constructor(private configService: NestConfigService) {
        this.database = this.configService.get<DBConfig>('database')!;
        this.kafka = this.configService.get<KafkaConfig>('kafka')!;
        this.redis = this.configService.get<RedisConfig>('redis')!;
        this.device = this.configService.get<DeviceConfig>('device')!;
        this.service = this.configService.get<ServiceConfig>('service')!;
    }
}