import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { getEnv } from './env';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client = new Redis(getEnv('REDIS_URL', 'redis://localhost:6379'));

  get connection(): Redis {
    return this.client;
  }

  duplicate(): Redis {
    return this.client.duplicate();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
