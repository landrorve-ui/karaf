import { Logger } from '@nestjs/common';
import { Kafka } from 'kafkajs';

const logger = new Logger('KafkaTopics');

function unique(topics: string[]): string[] {
  return [...new Set(topics)].filter(Boolean);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureKafkaTopics(
  clientId: string,
  topics: string[],
  brokers: string[],
): Promise<void> {
  const normalizedTopics = unique(topics);
  if (normalizedTopics.length === 0) {
    return;
  }

  const kafka = new Kafka({
    clientId,
    brokers: brokers,
    retry: { retries: 5 },
  });
  const admin = kafka.admin();

  await admin.connect();
  try {
    const existing = new Set(await admin.listTopics());
    const missingTopics = normalizedTopics.filter(
      (topic) => !existing.has(topic),
    );

    if (missingTopics.length > 0) {
      await admin.createTopics({
        waitForLeaders: true,
        topics: missingTopics.map((topic) => ({
          topic,
          numPartitions: 3,
          replicationFactor: 1,
        })),
      });
    }

    await waitForTopicMetadata(admin, normalizedTopics);
  } finally {
    await admin.disconnect();
  }
}

async function waitForTopicMetadata(
  admin: ReturnType<Kafka['admin']>,
  topics: string[],
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      const metadata = await admin.fetchTopicMetadata({ topics });
      const present = new Set(metadata.topics.map((topic) => topic.name));
      const missing = topics.filter((topic) => !present.has(topic));
      if (missing.length === 0) {
        return;
      }
      lastError = new Error(`missing topic metadata: ${missing.join(', ')}`);
    } catch (error) {
      lastError = error;
    }

    await delay(250 * attempt);
  }

  logger.warn(
    lastError instanceof Error
      ? lastError.message
      : `topic metadata was not ready for ${topics.join(', ')}`,
  );
}
