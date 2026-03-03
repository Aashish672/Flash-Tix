# FlashTix Load Testing — Quick Reference

## Prerequisites
```powershell
pip install locust redis psycopg2-binary requests
```

## Workflow (in order)

### 1. Seed test data
```powershell
python seed_event.py --host http://<EC2_IP>
# Outputs: "TEST_EVENT_ID=X" — note that number
```

### 2. Set environment variables (PowerShell — do this once per terminal session)
```powershell
$env:AUTH_HOST     = "http://<EC2_IP>:8005"
$env:INV_HOST      = "http://<EC2_IP>:8001"
$env:ORDER_HOST    = "http://<EC2_IP>:8002"
$env:TEST_EVENT_ID = "<EVENT_ID_FROM_STEP_1>"
```

### 3. Smoke test
```powershell
locust -f locustfile.py --host http://<EC2_IP> `
  --headless -u 50 -r 5 --run-time 60s --html smoke.html
```

### 4. Load test (1,000 users)
```powershell
locust -f locustfile.py --host http://<EC2_IP> `
  --headless -u 1000 -r 20 --run-time 3m --html load.html
```

### 5. Spike test — 10k users (the resume number)
```powershell
locust -f locustfile.py --host http://<EC2_IP> `
  --headless -u 10000 -r 200 --run-time 5m --html spike.html
```

### 6. Web UI mode (for screenshots/demo)
```powershell
# Opens live dashboard at http://localhost:8089
locust -f locustfile.py --host http://<EC2_IP>
```

### 7. Verify zero oversell (run on the EC2 via SSH)
```bash
python3 tests/load/verify_inventory.py --event-id <ID>
```

## Chaos Testing
See `tests/chaos/chaos_runbook.md` — run during Step 5 spike test via SSH.
