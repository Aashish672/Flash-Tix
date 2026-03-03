"""
FlashTix Test Data Seeder
==========================
Creates a test event with 10,000 tickets via the inventory API.
Also creates an organizer user via the auth API.

Run ONCE before load tests:
    python seed_event.py --host http://<EC2_IP>

Outputs the EVENT_ID to use with locustfile.py:
    TEST_EVENT_ID=3 locust -f locustfile.py --host http://<EC2_IP> ...
"""

import argparse
import requests
import sys
from datetime import datetime, timedelta

def main():
    parser = argparse.ArgumentParser(description="Seed FlashTix test event")
    parser.add_argument("--host",         default="http://localhost",  help="Base host (e.g. http://12.34.56.78)")
    parser.add_argument("--auth-port",    default="8005", help="Auth service port")
    parser.add_argument("--inv-port",     default="8001", help="Inventory service port")
    parser.add_argument("--tickets",      default=10000,  type=int, help="Number of tickets on test event")
    parser.add_argument("--price",        default=500,    type=int, help="Price per ticket (INR)")
    args = parser.parse_args()

    auth_url = f"{args.host}:{args.auth_port}"
    inv_url  = f"{args.host}:{args.inv_port}"

    print(f"\n{'='*55}")
    print("  FlashTix Test Data Seeder")
    print(f"{'='*55}")
    print(f"  Auth service : {auth_url}")
    print(f"  Inventory    : {inv_url}")
    print(f"  Tickets      : {args.tickets:,}")
    print(f"{'='*55}\n")

    # ── Step 1: Create organizer account ──────────────────────────────────────
    organizer_email    = "organizer@flashtix-loadtest.com"
    organizer_password = "Organizer@123"

    print("Step 1/3 — Creating organizer account...")
    resp = requests.post(f"{auth_url}/register", json={
        "email":        organizer_email,
        "name":         "Load Test Organizer",
        "password":     organizer_password,
        "is_organizer": True,
    })
    if resp.status_code == 400 and "already registered" in resp.text.lower():
        print("         Organizer already exists — OK")
    elif resp.status_code == 200:
        print(f"         Created organizer: {organizer_email}")
    else:
        print(f"         ❌ Failed to create organizer: {resp.status_code} {resp.text}")
        sys.exit(1)

    # ── Step 2: Login as organizer ────────────────────────────────────────────
    print("Step 2/3 — Logging in as organizer...")
    resp = requests.post(f"{auth_url}/login", data={
        "username": organizer_email,
        "password": organizer_password,
    })
    if resp.status_code != 200:
        print(f"         ❌ Login failed: {resp.status_code} {resp.text}")
        sys.exit(1)

    token = resp.json()["access_token"]

    # Decode organizer_id from JWT
    import base64, json as _json
    payload_b64 = token.split(".")[1]
    payload_b64 += "=" * (4 - len(payload_b64) % 4)
    payload = _json.loads(base64.b64decode(payload_b64))
    organizer_id = payload.get("id", 1)
    print(f"         Logged in — organizer_id={organizer_id}")

    # ── Step 3: Create test event ──────────────────────────────────────────────
    event_date = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%S")
    print(f"Step 3/3 — Creating event with {args.tickets:,} tickets...")

    resp = requests.post(f"{inv_url}/events", json={
        "name":          f"FlashTix Load Test Event {datetime.utcnow().strftime('%H:%M')}",
        "date":          event_date,
        "price_inr":     args.price,
        "total_tickets": args.tickets,
        "organizer_id":  organizer_id,
    })

    if resp.status_code != 200:
        print(f"         ❌ Failed to create event: {resp.status_code} {resp.text}")
        sys.exit(1)

    event = resp.json()
    event_id = event["id"]

    print(f"\n{'='*55}")
    print(f"  ✅ TEST EVENT CREATED SUCCESSFULLY")
    print(f"{'='*55}")
    print(f"  Event ID  : {event_id}")
    print(f"  Name      : {event['name']}")
    print(f"  Tickets   : {args.tickets:,}")
    print(f"  Price     : ₹{args.price}")
    print(f"{'='*55}")
    print(f"\n  Run your load test with:")
    print(f"  TEST_EVENT_ID={event_id} locust -f locustfile.py --host {args.host} ...")
    print(f"\n  After testing, verify with:")
    print(f"  python verify_inventory.py --host {args.host} --event-id {event_id}")
    print()

if __name__ == "__main__":
    main()
