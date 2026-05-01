import { getNumberEnv, getStringArrayEnv, getStringEnv } from "./helper";


export default () => ({
  database: {
    url:getStringEnv('DATABASE_URL'),
  },
  kafka: {
    brokers: getStringArrayEnv('KAFKA_BROKERS'),
  },
  redis: {
    url: getStringEnv('REDIS_URL'),
  },
  device: {
    statusTtlSeconds: getNumberEnv('DEVICE_STATUS_TTL_SECONDS', 300),
  },
  service: {
    cacheTtlSeconds: getNumberEnv('SERVICE_CACHE_TTL_SECONDS', 300),
    deviceMonitoringPort: getNumberEnv('DEVICE_MONITORING_PORT', 3000),
    dashboardServicePort: getNumberEnv('DASHBOARD_SERVICE_PORT', 3001),
  },
});
