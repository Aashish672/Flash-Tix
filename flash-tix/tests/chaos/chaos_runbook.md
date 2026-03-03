# FlashTix — Chaos Testing Runbook

## Overview

Chaos testing validates that FlashTix survives infrastructure failures without data corruption (oversell) or permanent downtime. Run these scenarios **while a Locust load test is actively running** so you can observe the impact in real time.

**Setup:** Two terminals open simultaneously
- **Terminal A** — your laptop running Locust (load generator)
- **Terminal B** — SSH session on the EC2 server (`ssh -i key.pem ubuntu@<EC2_IP>`)

---

## Before You Start

```bash
# Terminal A (laptop) — start the load test
locust -f tests/load/locustfile.py --host http://<EC2_IP> \
  --headless -u 1000 -r 20 --run-time 10m --html chaos_report.html

# Terminal B (EC2 SSH)
cd Flash-Tix/flash-tix
watch docker-compose ps   # keep this running to observe container states
```

---

## Scenario 1 — Redis Crash During Booking Spike

**What we test:** The system should fail safely when Redis goes down (reject requests or return 500), then automatically re-sync stock from Postgres when Redis comes back.

```bash
# Terminal B — kill Redis
docker-compose kill redis

# Wait 15–30 seconds, observe Locust error rate spike in Terminal A
# The inventory service should return 500/503 errors — that's OK
sleep 20

# Restart Redis
docker-compose start redis

# Watch the inventory service logs — it re-syncs all stock from Postgres on startup
docker-compose logs -f inventory-service
```

**Pass criteria:**
- ✅ Error rate spikes while Redis is down, then drops back to normal
- ✅ After restart: `docker-compose logs inventory-service | grep "Synced Event"` shows re-sync
- ✅ No extra stock added (run `verify_inventory.py` after)

---

## Scenario 2 — RabbitMQ Outage

**What we test:** Payment-order async messaging should queue up locally and redeliver when RabbitMQ recovers. No orders should be permanently lost.

```bash
# Terminal B — kill RabbitMQ
docker-compose kill rabbitmq
sleep 30  # Observe — inventory reserves still work, but order async flow breaks

# Restart
docker-compose start rabbitmq

# Watch payment service reconnect and redeliver queued messages
docker-compose logs -f payment-service
docker-compose logs -f notification-service
```

**Pass criteria:**
- ✅ `POST /inventory/reserve` still works during outage (Redis handles it)
- ✅ After restart, RabbitMQ reconnects (check logs for "Connection established")
- ✅ Any backed-up payment events are processed after recovery

---

## Scenario 3 — Rolling Restart of Inventory Service

**What we test:** Zero-downtime service restart. Simulates a deployment or crash-restart scenario.

```bash
# Terminal B — restart inventory service
docker-compose restart inventory-service

# Watch logs — it should be back up in ~5–10 seconds
docker-compose logs -f inventory-service
```

**Pass criteria:**
- ✅ Locust shows a brief error spike (5–15 seconds) then full recovery
- ✅ Stock re-synced from Postgres on restart (check logs)
- ✅ No oversell after verify_inventory.py

---

## Scenario 4 — Postgres Brief Outage

**What we test:** Database recovery. The Redis stock counter acts as a buffer; requests fail gracefully when Postgres is down.

```bash
# Terminal B — kill Postgres (most disruptive)
docker-compose kill postgres
sleep 15  # Redis-only requests may still partially work

# Restart
docker-compose start postgres

# Wait for health check to pass, then services recover
docker-compose logs -f inventory-service
```

**Pass criteria:**
- ✅ Services return clean errors (400/500) — not silent data corruption
- ✅ On recovery, stock in Postgres matches what Redis says
- ✅ No oversell detected by verify_inventory.py

---

## Scenario 5 — Full Stack Recovery

**What we test:** Everything restarts and the system comes back clean.

```bash
# Terminal B — bounce everything
docker-compose restart

# Check all services come back up
docker-compose ps
```

**Pass criteria:**
- ✅ All 7 containers show "Up" within 60 seconds
- ✅ Redis re-synced from Postgres on startup
- ✅ Frontend accessible at http://<EC2_IP>:3000

---

## After All Chaos Scenarios

```bash
# Run on your laptop — connects to EC2's Redis and Postgres
python tests/load/verify_inventory.py \
  --host http://<EC2_IP> \
  --event-id <EVENT_ID> \
  --redis-host <EC2_IP> \
  --pg-host <EC2_IP>
```

Expected output:
```
✅ ALL CHECKS PASSED — Zero oversell detected!
   9847 tickets sold, 153 remaining
   Redis and Postgres are in sync
```

---

## What to Screenshot / Record for Your Resume

1. Locust **Web UI dashboard** during the kill scenario (shows error spike then recovery)
2. Terminal output of `verify_inventory.py` showing **zero oversell**
3. Docker logs showing **"Synced Event X stock to Redis"** after restart
4. Locust **HTML report** from the final spike test (RPS, p99 latency chart)
