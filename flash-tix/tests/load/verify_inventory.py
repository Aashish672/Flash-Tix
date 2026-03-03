"""
FlashTix Post-Test Inventory Consistency Checker
==================================================
After a load test run, verifies that:
  1. Redis stock == Postgres available_tickets
  2. initial_tickets - confirmed_orders == remaining stock
  3. NO oversell occurred (tickets sold never exceed initial supply)

Run after every load test:
    python verify_inventory.py --host http://<EC2_IP> --event-id <ID>

Requirements:
    pip install redis psycopg2-binary requests
"""

import argparse
import sys
import redis
import psycopg2
import requests

# ── Defaults matching docker-compose.yml ──────────────────────────────────────
DEFAULT_REDIS_HOST = "localhost"
DEFAULT_REDIS_PORT = 6379
DEFAULT_PG_HOST    = "localhost"
DEFAULT_PG_PORT    = 5432
DEFAULT_PG_USER    = "flashuser"
DEFAULT_PG_PASS    = "flashpass"
DEFAULT_PG_DBNAME  = "inventory_db"
DEFAULT_ORDER_DB   = "order_db"


def check_redis_stock(redis_host, redis_port, event_id):
    r = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
    key = f"event:{event_id}:stock"
    value = r.get(key)
    if value is None:
        print(f"  ⚠️  Redis key '{key}' not found (service may not have started yet)")
        return None
    return int(value)


def check_postgres_stock(pg_host, pg_port, pg_user, pg_pass, pg_db, event_id):
    conn = psycopg2.connect(
        host=pg_host, port=pg_port,
        user=pg_user, password=pg_pass,
        dbname=pg_db,
    )
    cur = conn.cursor()
    cur.execute("SELECT available_tickets, total_tickets FROM events WHERE id = %s", (event_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        print(f"  ❌ Event {event_id} not found in Postgres inventory_db")
        sys.exit(1)
    return row[0], row[1]  # available, total


def count_confirmed_orders(pg_host, pg_port, pg_user, pg_pass, event_id):
    conn = psycopg2.connect(
        host=pg_host, port=pg_port,
        user=pg_user, password=pg_pass,
        dbname=DEFAULT_ORDER_DB,
    )
    cur = conn.cursor()
    cur.execute(
        "SELECT COALESCE(SUM(quantity), 0) FROM orders WHERE event_id = %s AND status IN ('CONFIRMED', 'PENDING_PAYMENT')",
        (event_id,),
    )
    total = int(cur.fetchone()[0])
    conn.close()
    return total


def main():
    parser = argparse.ArgumentParser(description="Verify inventory consistency after load test")
    parser.add_argument("--host",       default="http://localhost", help="App host (used for info only)")
    parser.add_argument("--event-id",   required=True, type=int,   help="Event ID to check")
    parser.add_argument("--redis-host", default=DEFAULT_REDIS_HOST)
    parser.add_argument("--redis-port", default=DEFAULT_REDIS_PORT, type=int)
    parser.add_argument("--pg-host",    default=DEFAULT_PG_HOST)
    parser.add_argument("--pg-port",    default=DEFAULT_PG_PORT,   type=int)
    parser.add_argument("--pg-user",    default=DEFAULT_PG_USER)
    parser.add_argument("--pg-pass",    default=DEFAULT_PG_PASS)
    args = parser.parse_args()

    event_id = args.event_id

    print(f"\n{'='*60}")
    print(f"  FlashTix Inventory Consistency Check — Event #{event_id}")
    print(f"{'='*60}\n")

    # ── Gather data ───────────────────────────────────────────────────────────
    print("Checking Redis stock...")
    redis_stock = check_redis_stock(args.redis_host, args.redis_port, event_id)

    print("Checking Postgres inventory_db...")
    pg_available, pg_total = check_postgres_stock(
        args.pg_host, args.pg_port, args.pg_user, args.pg_pass,
        DEFAULT_PG_DBNAME, event_id,
    )

    print("Counting orders in order_db...")
    order_count = count_confirmed_orders(
        args.pg_host, args.pg_port, args.pg_user, args.pg_pass, event_id,
    )

    # ── Print results table ───────────────────────────────────────────────────
    print(f"\n{'─'*60}")
    print(f"  {'Metric':<35} {'Value':>10}")
    print(f"{'─'*60}")
    print(f"  {'Total tickets (initial supply)':<35} {pg_total:>10,}")
    print(f"  {'Postgres available_tickets':<35} {pg_available:>10,}")
    print(f"  {'Redis stock':<35} {str(redis_stock) if redis_stock is not None else 'N/A':>10}")
    print(f"  {'Orders (CONFIRMED + PENDING_PAYMENT)' :<35} {order_count:>10,}")
    print(f"{'─'*60}")

    # ── Assertions ────────────────────────────────────────────────────────────
    errors = []

    # 1. Redis == Postgres
    if redis_stock is not None and redis_stock != pg_available:
        errors.append(
            f"Redis stock ({redis_stock}) ≠ Postgres available ({pg_available}) — "
            f"drift of {abs(redis_stock - pg_available)} tickets"
        )

    # 2. initial - orders == postgres_remaining
    expected_remaining = pg_total - order_count
    if pg_available != expected_remaining:
        errors.append(
            f"Postgres remaining ({pg_available}) ≠ initial({pg_total}) - orders({order_count}) = {expected_remaining} "
            f"→ {abs(pg_available - expected_remaining)} ticket(s) OVERSOLD or leaked"
        )

    # 3. Oversell guard: orders must never exceed total
    if order_count > pg_total:
        errors.append(
            f"🚨 OVERSELL! {order_count} tickets sold but only {pg_total} were available. "
            f"Oversell count: {order_count - pg_total}"
        )

    # ── Verdict ───────────────────────────────────────────────────────────────
    print()
    if not errors:
        print(f"  ✅ ALL CHECKS PASSED — Zero oversell detected!")
        print(f"     {pg_total - pg_available:,} tickets sold, {pg_available:,} remaining")
        print(f"     Redis and Postgres are in sync\n")
        sys.exit(0)
    else:
        print(f"  ❌ CONSISTENCY ERRORS FOUND:\n")
        for e in errors:
            print(f"     • {e}")
        print()
        sys.exit(1)


if __name__ == "__main__":
    main()
