import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';

export interface OperationLogContext {
  requestId?: string;
  deviceId?: string;
  [key: string]: unknown;
}

export function requestIdFromHeaders(headers: Record<string, unknown>): string {
  const header = headers['x-request-id'];
  if (typeof header === 'string' && header.length > 0) {
    return header;
  }

  return randomUUID();
}

export async function logOperation<T>(
  logger: Logger,
  operation: string,
  context: OperationLogContext,
  work: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await work();
    logger.log({
      operation,
      requestId: context.requestId,
      deviceId: context.deviceId,
      latency: Date.now() - startedAt,
      status: 'ok',
      ...context,
    });
    return result;
  } catch (error) {
    // logger.error({
    //   operation,
    //   requestId: context.requestId,
    //   deviceId: context.deviceId,
    //   latency: Date.now() - startedAt,
    //   status: 'error',
    //   error: error instanceof Error ? error.message : String(error),
    //   ...context,
    // });
    throw error;
  }
}
