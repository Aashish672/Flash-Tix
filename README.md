# FlashTix - High Concurrency Ticket Booking System

FlashTrix is a backend-focused distributed system designed to handle high-concurrency ticket booking scenarios without overselling, using PostgrSQL, Redis, and event-driven microservices.

## System Design Overview
FlashTix is designed to handle high-concurrency ticket booking scenarios by centralizing inventory ownership, using synchronous reservation for strong consistency, and asynchronus event-driven workflows for payment and notifications.