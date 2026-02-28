import pika
import json
import requests
import time
from app.database import SessionLocal
from app.models.order import Order

def callback(ch, method, properties, body):
    try:
        data = json.loads(body)
        order_id = data["order_id"]
        status = data["status"]
    except Exception as e:
        print(f"Error decoding JSON message in Order Service: {e}. Body: {body}")
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    db = SessionLocal()

    try:
        order = db.query(Order).filter(Order.id == order_id).first()

        if not order:
            print(f"Order {order_id} not found in database.")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        # IDEMPOTENCY: Check if order already processed
        if order.status in ["CONFIRMED", "CANCELLED"]:
            print(f"Order {order_id} already processed with status {order.status}. Skipping.")
            db.close()
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        if status == "success":
            order.status = "CONFIRMED"
        else:
            order.status = "CANCELLED"

            # Compensate inventory
            try:
                inventory_res = requests.post(
                    "http://inventory-service:8000/inventory/release",
                    json={
                        "event_id": order.event_id,
                        "quantity": order.quantity
                    },
                    timeout=5
                )
                if inventory_res.status_code != 200:
                    print(f"Inventory Service returned {inventory_res.status_code} for order {order_id}")
                    # Re-queue message if inventory release failed? 
                    # For chaos testing, let's keep it simple: if it's a 4xx, we might skip, but if inventory service is DOWN, we should NOT ack.
            except requests.exceptions.RequestException as e:
                print(f"Inventory Service unreachable for order {order_id}: {e}. NO-ACKing message.")
                db.rollback()
                db.close()
                return # No ACK, RabbitMQ will redeliver

        db.commit()
        print(f"Order {order_id} updated to {order.status}")
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"Error in Order Service callback for order {order_id}: {e}. NO-ACKing message.")
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
                exchange='payment_exchange',
                exchange_type='direct',
                durable=True
            )

            channel.queue_declare(queue='order_queue', durable=True)

            channel.queue_bind(
                exchange='payment_exchange',
                queue='order_queue',
                routing_key='payment_success'
            )

            channel.queue_bind(
                exchange='payment_exchange',
                queue='order_queue',
                routing_key='payment_failed'
            )

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue='order_queue', on_message_callback=callback)

            print("Order Service waiting for payment results...")
            channel.start_consuming()
        except (pika.exceptions.AMQPConnectionError, pika.exceptions.ConnectionClosedByBroker):
            print("RabbitMQ connection failed in Order Service, retrying in 5 seconds...")
            time.sleep(5)
        except Exception as e:
            print(f"Unexpected error in Order Service consumer: {e}")
            time.sleep(5)