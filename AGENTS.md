# AGENTS.md

## 1. Mission

This system using a microservices monorepo architecture processes IoT data streams and provides:

* Real-time device status
* Time-series analytics
* Aggregated dashboard reports

Codex must optimize for:

* correctness
* scalability
* idempotency
* observability

---

## 2. Architecture Style

* Event-driven microservices
* Kafka = source of truth
* Redis = ephemeral state + cache
* PostgreSQL = analytics + aggregation

Rules:

* NEVER call service directly
* ALWAYS use Kafka events

---

## 3. Services

### device-monitoring

* consumes: device.ping
* manages Redis TTL (30s)
* emits: device.online / device.offline
* pushes WebSocket events

### dashboard

* consumes telemetry events
* aggregates data
* serves API
* handles auth (JWT)

---

## 4. Golden Rules

### 4.1 Idempotency (MANDATORY)

Every Kafka consumer must:

if incoming.timestamp <= stored.timestamp:
ignore

---

### 4.2 Ordering

* Kafka partition key = deviceId
* Guarantees per-device ordering

---

### 4.3 Stateless services

* No in-memory state
* Use Redis / DB only

---

### 4.4 Layering

controller → service → repository

Forbidden:

* DB access in controller
* Redis access in controller

---

## 5. Redis Rules

### Device state

key: device:{deviceId}
value: lastSeenAt
TTL: 30s

### Cache

key: cache:{resource}:{hash}
TTL: 60–300s

---

## 6. Kafka Rules

* Validate schema
* Retry on failure
* Send to DLQ if failed
* Do NOT crash consumer

---

## 7. Database Rules

### Raw events

* append-only
* never update/delete

### Aggregation tables

* precomputed
* used by dashboard

---

## 8. Realtime Rules

* Only device-monitoring emits realtime
* Use Redis Pub/Sub for scaling
* WebSocket nodes must be stateless

---

## 9. Coding Standards

* TypeScript strict mode
* DTO validation required
* Use dependency injection
* Structured logging required
* use async/await if possible
* avoid using any if possible

---

## 10. Observability

Every operation must log:

* requestId
* deviceId (if available)
* latency

---

## 11. Anti-patterns

❌ Query raw events for dashboard
❌ Non-idempotent consumers
❌ Long DB transactions
❌ Business logic in controllers
❌ Tight coupling between services

---

## 12. Codex Task Format

Task:
Context:
Requirements:
Acceptance:

---

## 13. Definition of Done

* Code compiles
* DTO validated
* Logs included
* Idempotency handled
* Tests added (if required)

