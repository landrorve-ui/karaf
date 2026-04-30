# Events

## Principles

* Events are facts (NOT commands)
* Immutable
* Versioned if needed

---

## device.ping

{
deviceId: string
timestamp: number
}

---

## device.online

{
deviceId: string
timestamp: number
}

---

## device.offline

{
deviceId: string
timestamp: number
}

---

## telemetry.temperature

{
deviceId: string
value: number
timestamp: number
}

---

## telemetry.presence

{
deviceId: string
roomId: string
timestamp: number
}

---

## Rules

* All events must include timestamp
* All events must be validated
* No schema breaking changes
