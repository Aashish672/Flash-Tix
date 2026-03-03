import pika
import json
import time
from app.database import SessionLocal
from app.models.event import Event, Reservation
from app.redis_client import redis_client

def callback(ch, method, properties, body):
    try:
        data = json.loads(body)
        event_id = data["event_id"]
        quantity = data["quantity"]
        order_id = data.get("order_id")
    except Exception as e:
        print(f"Error decoding JSON message in Inventory Service: {e}")
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    db = SessionLocal()
    try:
        # 1. Update Reservation status if it exists
        if order_id:
            # Note: We need a way to link Order ID to Reservation if we want to be precise,
            # but for now, we'll just release the inventory based on event_id/quantity
            res = db.query(Reservation).filter(
                Reservation.event_id == event_id,
                Reservation.quantity == quantity,
                Reservation.status == "PENDING"
            ).order_by(Reservation.created_at.desc()).first()
            
            if res:
                res.status = "CANCELLED"
        
        # 2. Return to Postgres
        event = db.query(Event).filter(Event.id == event_id).first()
        if event:
            event.available_tickets += quantity
            
            # 3. Return to Redis
            stock_key = f"event:{event_id}:stock"
            redis_client.incrby(stock_key, quantity)
            
        db.commit()
        
        # 4. Broadcast update
        try:
            import asyncio
            from app.sse_manager import broadcaster
            loop = asyncio.get_event_loop()
            asyncio.run_coroutine_threadsafe(
                broadcaster.broadcast({"type": "stock_update", "event_id": event_id, "stock": event.available_tickets}),
                loop
            )
        except Exception:
            pass

        print(f"Inventory released for cancelled order {order_id} (Event: {event_id}, Qty: {quantity})")
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"Error in Inventory Service callback: {e}")
        db.rollback()
    finally:
        db.close()

def start_consumer():
    while True:
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host='rabbitmq', heartbeat=600)
            )
            channel = connection.channel()

            channel.exchange_declare(
                exchange='order_exchange',
                exchange_type='direct',
                durable=True
            )

            channel.queue_declare(queue='inventory_queue', durable=True)

            channel.queue_bind(
                exchange='order_exchange',
                queue='inventory_queue',
                routing_key='order_cancelled'
            )

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue='inventory_queue', on_message_callback=callback)

            print("Inventory Service waiting for cancellation events...")
            channel.start_consuming()
        except (pika.exceptions.AMQPConnectionError, pika.exceptions.ConnectionClosedByBroker):
            print("RabbitMQ connection failed in Inventory Service, retrying in 5 seconds...")
            time.sleep(5)
        except Exception as e:
            print(f"Unexpected error in Inventory Service consumer: {e}")
            time.sleep(5)
