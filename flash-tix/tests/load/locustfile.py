"""
FlashTix Load Test — Locust
============================
Simulates realistic user flow:
  1. Register a unique user (once on startup)
  2. Login → get JWT token
  3. Browse events (GET /events)
  4. Hammer POST /inventory/reserve on the seeded test event

Usage:
  # Headless (automated, saves HTML report):
  locust -f locustfile.py --host http://<EC2_IP> --headless \
         -u 1000 -r 20 --run-time 3m --html report_load.html

  # Web UI (interactive dashboard at http://localhost:8089):
  locust -f locustfile.py --host http://<EC2_IP>

Environment:
  Set TEST_EVENT_ID to the event ID created by seed_event.py (default: 1)
  e.g.  TEST_EVENT_ID=3 locust -f locustfile.py ...
"""

import uuid
import os
from locust import HttpUser, task, between, events

# ── Config ────────────────────────────────────────────────────────────────────
AUTH_HOST   = os.getenv("AUTH_HOST",  "http://localhost:8005")   # override if separate
INV_HOST    = os.getenv("INV_HOST",   "http://localhost:8001")
ORDER_HOST  = os.getenv("ORDER_HOST", "http://localhost:8002")
EVENT_ID    = int(os.getenv("TEST_EVENT_ID", "1"))
QUANTITY    = 1  # tickets per reservation attempt


class TicketBuyer(HttpUser):
    """
    Simulates a user who:
      - registers + logs into the auth service
      - browses events on the inventory service
      - repeatedly tries to reserve a ticket (the hot path)
    """
    wait_time = between(0.5, 2)  # realistic think-time between requests

    def on_start(self):
        """Called once per simulated user on spawn. Registers + logs in."""
        self.token = None
        self.user_id = None
        self.email = f"loadtest_{uuid.uuid4().hex[:8]}@flashtix-test.com"
        self.name  = f"Load Tester {uuid.uuid4().hex[:6]}"
        password   = "LoadTest@123"

        # Register
        with self.client.post(
            f"{AUTH_HOST}/register",
            json={"email": self.email, "name": self.name, "password": password, "is_organizer": False},
            catch_response=True,
            name="[auth] POST /register",
        ) as resp:
            if resp.status_code not in (200, 400):  # 400 = already registered (idempotent ok)
                resp.failure(f"Registration failed: {resp.text}")
                return

        # Login (OAuth2 form)
        with self.client.post(
            f"{AUTH_HOST}/login",
            data={"username": self.email, "password": password},
            catch_response=True,
            name="[auth] POST /login",
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                self.token   = data.get("access_token")
                # Decode user_id from JWT payload (middle section)
                import base64, json as _json
                try:
                    payload_b64 = self.token.split(".")[1]
                    # Pad base64
                    payload_b64 += "=" * (4 - len(payload_b64) % 4)
                    payload = _json.loads(base64.b64decode(payload_b64))
                    self.user_id = payload.get("id", 1)
                except Exception:
                    self.user_id = 1
            else:
                resp.failure(f"Login failed: {resp.text}")

    @property
    def auth_headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    # ── Tasks ─────────────────────────────────────────────────────────────────

    @task(1)
    def browse_events(self):
        """Low-frequency browse — simulates realistic traffic mix."""
        with self.client.get(
            f"{INV_HOST}/events",
            name="[inventory] GET /events",
            catch_response=True,
        ) as resp:
            if resp.status_code != 200:
                resp.failure(f"List events failed: {resp.status_code}")

    @task(9)
    def reserve_ticket(self):
        """
        THE HOT PATH — 9x more frequent than browsing.
        This is the endpoint that must handle 10k concurrent users without overselling.
        """
        if not self.token:
            return  # user didn't log in successfully

        with self.client.post(
            f"{INV_HOST}/inventory/reserve",
            json={"event_id": EVENT_ID, "quantity": QUANTITY},
            headers=self.auth_headers,
            catch_response=True,
            name="[inventory] POST /inventory/reserve ⭐",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            elif resp.status_code == 400:
                # "Sold Out" is an expected, valid response — not a failure
                data = resp.json()
                if "Sold Out" in data.get("detail", "") or "sold" in data.get("detail", "").lower():
                    resp.success()  # mark as OK — sold out is correct behaviour
                else:
                    resp.failure(f"Reserve failed (400): {resp.text}")
            else:
                resp.failure(f"Reserve failed ({resp.status_code}): {resp.text}")


# ── Listener: print summary stats on test end ──────────────────────────────────
@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    print("\n" + "=" * 60)
    print("LOAD TEST COMPLETE — Summary")
    print("=" * 60)
    stats = environment.stats.total
    print(f"  Total Requests  : {stats.num_requests}")
    print(f"  Failures        : {stats.num_failures}")
    print(f"  Failure Rate    : {stats.fail_ratio * 100:.2f}%")
    print(f"  Median Latency  : {stats.median_response_time:.0f} ms")
    print(f"  p95 Latency     : {stats.get_response_time_percentile(0.95):.0f} ms")
    print(f"  p99 Latency     : {stats.get_response_time_percentile(0.99):.0f} ms")
    print(f"  Peak RPS        : {stats.total_rps:.1f}")
    print("=" * 60)
    print("Next step → run verify_inventory.py to check for oversells!")
