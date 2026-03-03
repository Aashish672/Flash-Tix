# FlashTix — AWS EC2 Deployment Guide

## What You'll Have After This Guide
- ✅ All 7 services running on a cloud VM
- ✅ Publicly accessible at `http://<YOUR_EC2_IP>:3000`
- ✅ A permanent URL to put on your resume and share with recruiters
- ✅ Ready for load and chaos testing without your laptop being the bottleneck

---

## Step 1 — Launch EC2 Instance

1. Log in to [AWS Console](https://console.aws.amazon.com) → **EC2 → Launch Instance**

2. Configure the instance:
   | Setting | Value |
   |---|---|
   | **Name** | `flashtix-server` |
   | **AMI** | Ubuntu Server 22.04 LTS |
   | **Instance type** | `t3.small` (2 vCPU, 2 GB RAM — minimum) |
   | **Key pair** | Create new → download `.pem` file → save safely |
   | **Storage** | 20 GB gp3 |

3. **Security Group** — Create new, add these inbound rules:
   | Type | Protocol | Port | Source |
   |---|---|---|---|
   | SSH | TCP | 22 | My IP |
   | Custom TCP | TCP | 3000 | 0.0.0.0/0 (Frontend) |
   | Custom TCP | TCP | 8001 | 0.0.0.0/0 (Inventory) |
   | Custom TCP | TCP | 8002 | 0.0.0.0/0 (Orders) |
   | Custom TCP | TCP | 8003 | 0.0.0.0/0 (Payments) |
   | Custom TCP | TCP | 8005 | 0.0.0.0/0 (Auth) |

4. Click **Launch Instance**

---

## Step 2 — Allocate a Static (Elastic) IP

Without this, your EC2's public IP changes every reboot.

1. EC2 Console → **Elastic IPs** → **Allocate Elastic IP address** → Allocate
2. Select the new IP → **Actions → Associate Elastic IP address**
3. Select your `flashtix-server` instance → Associate

> **Note:** Elastic IPs are **free while attached** to a running instance.

Your server's permanent IP is now: `<YOUR_ELASTIC_IP>`

---

## Step 3 — SSH Into the Server

```powershell
# Windows PowerShell — first fix key permissions:
icacls "C:\path\to\your-key.pem" /inheritance:r /grant:r "$($env:USERNAME):(R)"

# Then connect:
ssh -i "C:\path\to\your-key.pem" ubuntu@<YOUR_ELASTIC_IP>
```

---

## Step 4 — Install Docker on the EC2

```bash
# Run all of this on the EC2 (copy-paste as one block):
sudo apt update && sudo apt install -y docker.io git curl

# Install Docker Compose v2
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
     -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add ubuntu user to docker group (so you don't need sudo)
sudo usermod -aG docker ubuntu

# Apply group change — IMPORTANT: log out and back in after this
exit
```

```powershell
# Reconnect after logging out:
ssh -i "C:\path\to\your-key.pem" ubuntu@<YOUR_ELASTIC_IP>
```

Verify installation:
```bash
docker --version        # Should show Docker version 24+
docker-compose version  # Should show v2+
```

---

## Step 5 — Deploy FlashTix

```bash
# Clone your repository
git clone https://github.com/Aashish672/Flash-Tix.git
cd Flash-Tix/flash-tix

# Copy env file and fill in SMTP credentials
cp .env.example .env
nano .env
# Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM
# Press Ctrl+X → Y → Enter to save
```

---

## Step 6 — Update Frontend URLs (Critical!)

The frontend React app needs to know the **EC2's public IP** to call the APIs.
Edit `docker-compose.yml`:

```bash
nano docker-compose.yml
```

Find the `frontend` service section and change `localhost` to your Elastic IP:

```yaml
frontend:
  environment:
    - VITE_INVENTORY_URL=http://<YOUR_ELASTIC_IP>:8001
    - VITE_API_URL=http://<YOUR_ELASTIC_IP>:8002
    - VITE_AUTH_URL=http://<YOUR_ELASTIC_IP>:8005
```

Save and exit (`Ctrl+X → Y → Enter`).

---

## Step 7 — Start All Services

```bash
docker-compose up -d --build
```

This will take 3–5 minutes the first time (downloading base images + building).

Check that all 9 containers are running:
```bash
docker-compose ps
```

Expected output — all should show `Up`:
```
flash-tix-postgres-1              Up
flash-tix-redis-1                 Up
flash-tix-rabbitmq-1              Up
flash-tix-auth-service-1          Up
flash-tix-inventory-service-1     Up
flash-tix-order-service-1         Up
flash-tix-payment-service-1       Up
flash-tix-notification-service-1  Up
flash-tix-frontend-1              Up
```

---

## Step 8 — Verify Deployment

From your laptop's browser, open:
- `http://<YOUR_ELASTIC_IP>:3000` → **FlashTix frontend should load**
- `http://<YOUR_ELASTIC_IP>:8001/health` → `{"status": "ok"}`
- `http://<YOUR_ELASTIC_IP>:8005/health` → `{"status": "ok"}`

🎉 **Your app is live on the internet!**

---

## Step 9 — Run Load Tests (from your laptop)

```powershell
# Install dependencies (one-time)
pip install locust redis psycopg2-binary requests

# Seed test data
cd "d:\FlashTix- Flash Sale Inventory System\flash-tix\tests\load"
python seed_event.py --host http://<YOUR_ELASTIC_IP>
# Note the EVENT_ID printed at the end

# Smoke test (verify everything works)
locust -f locustfile.py --host http://<YOUR_ELASTIC_IP> `
  -e AUTH_HOST=http://<YOUR_ELASTIC_IP>:8005 `
  -e INV_HOST=http://<YOUR_ELASTIC_IP>:8001 `
  -e TEST_EVENT_ID=<EVENT_ID> `
  --headless -u 50 -r 5 --run-time 60s --html smoke_report.html

# Full spike test — the resume headline number
locust -f locustfile.py --host http://<YOUR_ELASTIC_IP> `
  -e AUTH_HOST=http://<YOUR_ELASTIC_IP>:8005 `
  -e INV_HOST=http://<YOUR_ELASTIC_IP>:8001 `
  -e TEST_EVENT_ID=<EVENT_ID> `
  --headless -u 10000 -r 200 --run-time 5m --html spike_report.html
```

> **Tip:** Run `locust -f locustfile.py --host http://<EC2_IP>` **without** `--headless` to get the live web dashboard at `http://localhost:8089` — great for screenshots!

---

## Step 10 — Verify Zero Oversell

After the spike test, from your laptop:

```powershell
# NOTE: verify_inventory.py connects to Redis/Postgres directly.
# For this to work from your laptop, temporarily open ports 5432 and 6379
# in your EC2 Security Group (then close them again after verification).

python verify_inventory.py `
  --event-id <EVENT_ID> `
  --redis-host <YOUR_ELASTIC_IP> `
  --pg-host <YOUR_ELASTIC_IP>
```

**OR**, run it directly on the EC2 server (no port changes needed):
```bash
# On the EC2:
cd ~/Flash-Tix/flash-tix
pip3 install redis psycopg2-binary requests
python3 tests/load/verify_inventory.py --event-id <EVENT_ID>
```

---

## Cost & Maintenance Tips

| Action | Cost |
|---|---|
| t3.small running 24/7 | ~$15/month |
| **Stop instance** (not running, keep storage) | ~$0.10/day |
| Elastic IP (attached to stopped instance) | $0.005/hr |

```bash
# Stop the server to save money when not using it:
# AWS Console → EC2 → Instances → select → Instance State → Stop

# Restart when you want to demo it:
# AWS Console → Instance State → Start
# (Elastic IP stays the same — your URL doesn't change)
```

---

## Quick Reference

| Service | URL |
|---|---|
| Frontend | `http://<EC2_IP>:3000` |
| Auth API | `http://<EC2_IP>:8005` |
| Inventory API | `http://<EC2_IP>:8001` |
| Order API | `http://<EC2_IP>:8002` |
| Payment API | `http://<EC2_IP>:8003` |
| RabbitMQ Dashboard | `http://<EC2_IP>:15672` (guest/guest) |
