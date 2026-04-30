# Architecture

## 1. High-level Design

IoT Devices
↓
Kafka (event backbone)
↓
-

## device-monitoring service

↓
Kafka (derived events)
↓
-

## dashboard service

↓
Frontend Dashboard

---

## 2. Key Principles

### Event-driven architecture

* Services react to events
* No direct service calls
* Loose coupling

This improves scalability and resilience ([Zignuts][1])

---

## 3. Data Flow

### Device status

device.ping → device-monitoring
→ Redis TTL
→ expiration OR fallback check
→ device.offline event
→ WebSocket push

---

### Telemetry

telemetry.* → dashboard
→ raw storage (PostgreSQL)
→ aggregation jobs
→ cached API

---

## 4. Scaling Strategy

### device-monitoring

* horizontal scaling
* Redis shared state

### dashboard

* read-heavy → caching
* DB read replicas

---

## 5. Failure Handling

Kafka:

* retry + DLQ

Redis:

* fallback scan

DB:

* retry + timeout

---

## 6. Partitioning

Kafka partition key:
deviceId

Ensures:

* ordering
* parallelism

---

## 7. System Bottlenecks

* Kafka lag
* Redis latency
* DB aggregation

Must monitor all

[1]: https://www.zignuts.com/blog/nestjs-kafka-event-driven-microservices?utm_source=chatgpt.com "Build Event-Driven NestJS Microservices with Kafka"
