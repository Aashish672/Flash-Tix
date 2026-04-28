# FlashTix 🎫

**A high-concurrency event ticketing platform that solves double-booking issues through distributed transactions and real-time inventory management.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## Demo / Screenshot

![FlashTix Demo](path/to/demo-image.png)  
*Add your demo GIF or screenshot here showing the booking flow and real-time updates.*

## Key Features

- **JWT-based Authentication with Refresh Token Rotation**: Secure user sessions with automatic token renewal for uninterrupted access.
- **Asynchronous Saga Pattern for Distributed Transactions**: Ensures atomicity across order, payment, and inventory services using RabbitMQ choreography.
- **Redis Lua Scripts for Atomic Stock Management**: Prevents race conditions in high-concurrency scenarios with server-side scripting.
- **Auto-Recovery Mechanism**: Background workers release abandoned holds after 5 minutes, maximizing ticket availability.
- **Real-Time SSE Notifications**: Server-sent events provide instant booking confirmations and status updates.

## Tech Stack

### Backend
- **Python 3.11** with **FastAPI** for high-performance REST APIs
- **SQLAlchemy** for ORM and database interactions
- **PostgreSQL** for relational data storage

### Frontend
- **React 19** with **Vite** for fast development and building
- **TypeScript** for type safety
- **Tailwind CSS** and **Framer Motion** for responsive, animated UI

### Infrastructure
- **RabbitMQ** for event-driven messaging
- **Redis** for caching and atomic operations
- **Docker & Docker Compose** for containerized deployment

## Architecture Overview

FlashTix employs a microservices architecture to achieve scalability and fault isolation. Each service owns its domain data and communicates asynchronously via RabbitMQ.

```
Frontend (React)
    ↓
Order Service (Saga Orchestrator)
├── Inventory Service (Stock Management)
├── Payment Service (Transaction Processing)
└── Notification Service (Real-Time Alerts)
```

This design enables independent scaling of services and implements the Saga pattern for distributed transactions, ensuring consistency without two-phase commits. Redis handles high-frequency inventory checks, while PostgreSQL maintains transactional integrity.

## Getting Started

### Prerequisites
- Docker and Docker Compose installed
- At least 4GB RAM available for containers

### Environment Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/Aashish672/Flash-Tix.git
   cd Flash-Tix
   ```

2. Navigate to the project directory:
   ```bash
   cd flash-tix
   ```

3. Initialize the database (if needed):
   ```bash
   ./init-db.sh
   ```

### Running Locally
1. Start all services:
   ```bash
   docker-compose up --build
   ```

2. Access the application:
   - Frontend: http://localhost:3001
   - RabbitMQ Management: http://localhost:15672 (guest/guest)

### Running Tests
```bash
# Run concurrency tests
python test_concurrency.py
```

## API Documentation

### Auth Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register a new user |
| POST | `/login` | Authenticate user and return JWT token |

### Order Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/orders` | Create a new order (initiates saga) |
| GET | `/orders/{id}` | Get order status |

### Inventory Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events` | Create new event |
| POST | `/events/{id}/reserve` | Reserve tickets |
| GET | `/events/{id}` | Get event details |

### Payment Service
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments` | Process payment |

## Challenges & Decisions

The most challenging aspect was implementing distributed transactions without traditional ACID guarantees. We chose the asynchronous Saga pattern over synchronous orchestration to avoid single points of failure and enable better scalability. This decision required careful error handling and compensation logic, but resulted in a system that can handle thousands of concurrent bookings without blocking.

## Future Improvements

- Implement API rate limiting and circuit breakers for enhanced resilience
- Add comprehensive monitoring with Prometheus and Grafana
- Introduce event sourcing for better audit trails and replay capabilities
- Develop a mobile app companion using React Native
- Integrate with external payment gateways for production readiness
