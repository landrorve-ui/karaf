export const KAFKA_TOPICS = {
  devicePing: 'device.ping',
  deviceOnline: 'device.online',
  deviceOffline: 'device.offline',
  telemetryTemperature: 'telemetry.temperature',
  telemetryPresence: 'telemetry.presence',
} as const;

export const KAFKA_DLQ_SUFFIX = '.dlq';

export const DEVICE_STATUS_CHANNEL = 'device-status-events';

export function getKnownKafkaTopics(): string[] {
  return Object.values(KAFKA_TOPICS);
}

export function getDlqTopic(topic: string): string {
  return `${topic}${KAFKA_DLQ_SUFFIX}`;
}

export interface DevicePingEvent {
  deviceId: string;
  timestamp: number;
}

export interface DeviceStatusEvent {
  deviceId: string;
  timestamp: number;
  status: 'online' | 'offline';
}

export interface TelemetryTemperatureEvent {
  deviceId: string;
  value: number;
  timestamp: number;
}

export interface TelemetryPresenceEvent {
  deviceId: string;
  roomId: string;
  timestamp: number;
}

export type TelemetryEvent = TelemetryTemperatureEvent | TelemetryPresenceEvent;

export function assertRecord(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('event payload must be an object');
  }
}

export function validateDevicePing(value: unknown): DevicePingEvent {
  assertRecord(value);
  const { deviceId, timestamp } = value;
  if (typeof deviceId !== 'string' || deviceId.length === 0) {
    throw new Error('deviceId must be a non-empty string');
  }
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    throw new Error('timestamp must be a finite number');
  }

  return { deviceId, timestamp };
}

export function validateTemperature(value: unknown): TelemetryTemperatureEvent {
  const event = validateDevicePing(value);
  assertRecord(value);
  if (typeof value.value !== 'number' || !Number.isFinite(value.value)) {
    throw new Error('value must be a finite number');
  }

  return { ...event, value: value.value };
}

export function validatePresence(value: unknown): TelemetryPresenceEvent {
  const event = validateDevicePing(value);
  assertRecord(value);
  if (typeof value.roomId !== 'string' || value.roomId.length === 0) {
    throw new Error('roomId must be a non-empty string');
  }

  return { ...event, roomId: value.roomId };
}
