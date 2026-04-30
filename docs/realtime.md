# Realtime System

## 1. Goal

Provide live device status updates

---

## 2. Flow

Kafka → device-monitoring
→ Redis TTL
→ Redis Pub/Sub
→ WebSocket

---

## 3. Scaling

Multiple instances:

device-monitoring
→ Redis Pub/Sub
→ all WebSocket nodes

---

## 4. Events

* device.online
* device.offline

---

## 5. Rules

* WebSocket must be stateless
* No DB queries in hot path
