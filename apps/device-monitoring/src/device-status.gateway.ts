import { createHash, randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { Duplex } from 'node:stream';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { DEVICE_STATUS_CHANNEL, RedisService } from '@lib/common';
import Redis from 'ioredis';

interface WebSocketClient {
  id: string;
  socket: Duplex;
}

@Injectable()
export class DeviceStatusGateway implements OnModuleDestroy {
  private readonly logger = new Logger(DeviceStatusGateway.name);
  private readonly clients = new Map<string, WebSocketClient>();
  private subscriber?: Redis;

  constructor(private readonly redis: RedisService) {}

  async bind(server: Server): Promise<void> {
    server.on('upgrade', (request, socket) => {
      if (request.url !== '/ws/device-status') {
        socket.destroy();
        return;
      }

      const key = request.headers['sec-websocket-key'];
      if (typeof key !== 'string') {
        socket.destroy();
        return;
      }

      const accept = createHash('sha1')
        .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
        .digest('base64');

      socket.write(
        [
          'HTTP/1.1 101 Switching Protocols',
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Accept: ${accept}`,
          '\r\n',
        ].join('\r\n'),
      );

      const clientId = randomUUID();
      this.clients.set(clientId, { id: clientId, socket });
      socket.on('close', () => this.clients.delete(clientId));
      socket.on('error', () => this.clients.delete(clientId));
    });

    this.subscriber = this.redis.duplicate();
    await this.subscriber.subscribe(DEVICE_STATUS_CHANNEL);
    this.subscriber.on('message', (_channel, message) => {
      this.broadcast(message);
    });
  }

  private broadcast(message: string): void {
    const frame = this.encode(message);
    for (const client of this.clients.values()) {
      if (client.socket.destroyed) {
        this.clients.delete(client.id);
        continue;
      }
      client.socket.write(frame);
    }
  }

  private encode(message: string): Buffer {
    const payload = Buffer.from(message);
    if (payload.length < 126) {
      return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
    }

    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
    return Buffer.concat([header, payload]);
  }

  async onModuleDestroy(): Promise<void> {
    for (const client of this.clients.values()) {
      client.socket.destroy();
    }
    this.clients.clear();
    try {
      await this.subscriber?.quit();
    } catch (error) {
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }
}
