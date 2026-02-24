# FlashTix - Flash Sale Inventory System

FlashTix is a high-performance, microservices-based inventory and order management system designed specifically for the unique challenges of flash sales (high concurrency, low latency, and transactional integrity).

## 🚀 Key Features

- **High-Concurrency Seat Reservation**: Utilizes Redis with Lua scripting and row-level Postgres locking to prevent overselling.
- **Idempotent Payment Processing**: Prevents double payments using custom idempotency keys tracked in Postgres.
- **Distributed Consistency**: Implements a compensation-based workflow (Saga pattern) to release inventory if downstream payment fails.
- **Service Health Aware**: Optimized Docker orchestration with intelligent health-checks ensuring zero-downtime dependency management.

## 🏗️ Architecture

The system consists of the following services:

1.  **Inventory Service**: Manages event seat availability. Uses Redis for fast decrement and Postgres as the source of truth.
2.  **Order Service**: Orchestrates the order lifecycle (Reserve -> Create -> Pay). Handles failures and triggers compensation logic.
3.  **Payment Service**: Simulates payment processing with built-in idempotency logic to handle network retries safely.
4.  **Notification Service**: (Stub) Planned for user alerts on order confirmation.

## 🛠️ Tech Stack

- **Backend**: Python 3.11, FastAPI
- **Database**: PostgreSQL 15 (SQLAlchemy ORM)
- **Caching**: Redis 7
- **DevOps**: Docker, Docker Compose

## ⚡ Recent Modifications & Improvements

- **Reliable Startup**: Integrated Docker health-checks (`pg_isready`) and service dependencies to ensure services only boot once Postgres is fully initialized.
- **Strict Idempotency**: Added `idempotency_key` support across Order and Payment services. Retrying a failed or pending payment now safely returns the existing state instead of creating duplicates.
- **Transactional Compensation**: Improved the `order-service` to reliably release tickets back to the pool if a payment fails during the transaction.
- **Code Quality**: Fixed several critical bugs in status transition logic and dependency management.

## 🚦 Getting Started

1.  **Start all services**:
    ```bash
    docker-compose up --build
    ```
2.  **Access points**:
    - Inventory Service: `http://localhost:8001`
    - Order Service: `http://localhost:8002`
    - Payment Service: `http://localhost:8003`

3.  **Database Access**:
    ```bash
    docker exec -it flash-tix-postgres-1 psql -U flashuser -d flashtix
    ```

## 🧪 Testing the Flow

To simulate a seat purchase:
```powershell
Invoke-RestMethod -Uri http://localhost:8002/orders -Method Post -ContentType "application/json" -Body '{"event_id": 1, "quantity": 1}'
```
