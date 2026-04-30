# Data Model

## 1. Raw Events

telemetry_events

* id
* deviceId
* type
* payload (JSONB)
* timestamp

Append-only

---

## 2. Aggregation Tables

### temperature_5m

* bucket_time
* deviceId
* avg_temp

---

### room_usage_daily

* date
* roomId
* usage_count

---

## 3. Aggregation Strategy

### Temperature

Group by 5-minute bucket

---

### Room usage

Count presence events per day

---

## 4. Indexing

* (deviceId, timestamp)
* (bucket_time)
* (date)

---

## 5. Rules

* Never query raw events for dashboard
* Always use aggregation tables
