import { Injectable } from '@nestjs/common';
import { Prisma, TelemetryType } from '@prisma/client';
import { DatabaseService } from './database.service';

export interface StoreTelemetryInput {
  consumer: string;
  deviceId: string;
  type: TelemetryType;
  timestamp: number;
  roomId?: string;
  value?: number;
  payload: Record<string, unknown>;
}

@Injectable()
export class TelemetryRepository {
  constructor(private readonly database: DatabaseService) {}

  async storeIfNewer(input: StoreTelemetryInput): Promise<boolean> {
    return this.database.$transaction(async (tx) => {
      const checkpoint = await tx.consumerCheckpoint.findUnique({
        where: {
          consumer_deviceId_eventType: {
            consumer: input.consumer,
            deviceId: input.deviceId,
            eventType: input.type,
          },
        },
      });

      if (checkpoint && BigInt(input.timestamp) <= checkpoint.timestamp) {
        return false;
      }

      await tx.telemetryEvent.create({
        data: {
          deviceId: input.deviceId,
          type: input.type,
          timestamp: BigInt(input.timestamp),
          roomId: input.roomId,
          value: input.value,
          payload: input.payload as Prisma.InputJsonObject,
        },
      });

      await tx.consumerCheckpoint.upsert({
        where: {
          consumer_deviceId_eventType: {
            consumer: input.consumer,
            deviceId: input.deviceId,
            eventType: input.type,
          },
        },
        create: {
          consumer: input.consumer,
          deviceId: input.deviceId,
          eventType: input.type,
          timestamp: BigInt(input.timestamp),
        },
        update: {
          timestamp: BigInt(input.timestamp),
        },
      });

      return true;
    });
  }

  async aggregateTemperatureSince(since: Date): Promise<number> {
    const rows = await this.database.$queryRaw<
      Array<{
        bucket_time: Date;
        device_id: string;
        avg_temp: number;
        sample_count: bigint;
      }>
    >`
      SELECT
        to_timestamp(floor(("timestamp"::double precision / 1000) / 300) * 300) AS bucket_time,
        "deviceId" AS device_id,
        avg(value) AS avg_temp,
        count(*) AS sample_count
      FROM telemetry_events
      WHERE type = 'temperature'
        AND "createdAt" >= ${since}
        AND value IS NOT NULL
      GROUP BY bucket_time, "deviceId"
    `;

    for (const row of rows) {
      await this.database.temperature5m.upsert({
        where: {
          bucketTime_deviceId: {
            bucketTime: row.bucket_time,
            deviceId: row.device_id,
          },
        },
        create: {
          bucketTime: row.bucket_time,
          deviceId: row.device_id,
          avgTemp: row.avg_temp,
          sampleCount: Number(row.sample_count),
        },
        update: {
          avgTemp: row.avg_temp,
          sampleCount: Number(row.sample_count),
        },
      });
    }

    return rows.length;
  }

  async aggregateRoomUsageSince(since: Date): Promise<number> {
    const rows = await this.database.$queryRaw<
      Array<{ date: Date; room_id: string; usage_count: bigint }>
    >`
      SELECT
        date_trunc('day', to_timestamp("timestamp"::double precision / 1000))::date AS date,
        "roomId" AS room_id,
        count(*) AS usage_count
      FROM telemetry_events
      WHERE type = 'presence'
        AND "createdAt" >= ${since}
        AND "roomId" IS NOT NULL
      GROUP BY date, "roomId"
    `;

    for (const row of rows) {
      await this.database.roomUsageDaily.upsert({
        where: {
          date_roomId: {
            date: row.date,
            roomId: row.room_id,
          },
        },
        create: {
          date: row.date,
          roomId: row.room_id,
          usageCount: Number(row.usage_count),
        },
        update: {
          usageCount: Number(row.usage_count),
        },
      });
    }

    return rows.length;
  }

  async getTemperatureBuckets(from: Date, to: Date, deviceId?: string) {
    return this.database.temperature5m.findMany({
      where: {
        bucketTime: { gte: from, lte: to },
        ...(deviceId ? { deviceId } : {}),
      },
      orderBy: [{ bucketTime: 'asc' }, { deviceId: 'asc' }],
    });
  }

  async getRoomUsage(date: Date) {
    return this.database.roomUsageDaily.findMany({
      where: { date },
      orderBy: { roomId: 'asc' },
    });
  }
}
