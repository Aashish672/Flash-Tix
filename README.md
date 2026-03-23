# FlashTix - Event Management Platform 🎫

FlashTix is a modern, microservices-based ticketing platform (similar to BookMyShow) designed for high-concurrency event bookings. It showcases advanced backend patterns like **Distributed Transactions (Saga Pattern)** and **Event-Driven Architecture**.

---

## 🌟 Key Features

- **Dynamic Event Management**: Admin users can create new events with specific ticket capacities directly from the dashboard.
- **Distributed Saga Transactions**: Uses an **Asynchronous Choreography-based Saga** via RabbitMQ to ensure consistency across Orders, Payments, and Inventory.
- **High-Concurrency Booking**: Implements atomic stock management using **Redis Lua Scripts** and Postgres row-level locking to prevent double-booking.
- **Auto-Recovery**: Abandoned ticket holds are automatically released after 5 minutes by a background worker, ensuring maximal inventory availability.
- **Real-Time Notifications**: A dedicated notification service listens for booking completions to simulate sending confirmations to users.
- **Premium User Experience**: Built with **Next.js 14**, **Tailwind CSS**, and **Framer Motion** for a smooth, high-end feel.

---

## 🏗️ Architecture

The system is built as a suite of decoupled microservices:

1. **Inventory Service**: Owns events and ticket stock. Handles reservations and auto-recovery.
2. **Order Service**: Manages the booking lifecycle and orchestrates the Saga flow.
3. **Payment Service**: Processes transactions and emits success/failure events.
4. **Notification Service**: Sends confirmation once the booking is fully confirmed.

### The Booking Flow
`Frontend` -> `Order Service` -> `Inventory Reservation (Sync)` -> `Order Created Event` -> `Payment Service` -> `Payment Result Event` -> `Order Service (Confirm)` -> `Notification Service (Alert)`.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.11 (FastAPI)
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Framer Motion
- **Messaging**: RabbitMQ (Message Broker)
- **Data Storage**: PostgreSQL (Relational), Redis (Fast Atomic Caching)
- **Containerization**: Docker & Docker Compose

---

## 🚦 Getting Started

### Launch the Platform
```bash
# Enter the project directory
cd flash-tix

# Start all microservices and the frontend
docker-compose up --build
```

### Access Points
- **Next.js Dashboard**: [http://localhost:3001](http://localhost:3001)
- **Message Broker (RabbitMQ)**: [http://localhost:15672](http://localhost:15672) (Guest/Guest)

---

## 💡 Interview Taking Points

When explaining this project in an interview, focus on:
1. **The Distributed Transaction Problem**: How you solved the "Booking vs. Payment" consistency problem using the Saga pattern.
2. **Concurrency Control**: How you used Redis Lua scripts to ensure ticket counts remain accurate under heavy load.
3. **Microservices Communication**: Why you chose asynchronous messaging (RabbitMQ) over synchronous HTTP for the payment flow.
4. **Resiliency**: How the system handles service failures without losing data.

---
## Project URL
http://13.205.67.44/
*Designed for high-scale engineering and senior-level software roles.*
