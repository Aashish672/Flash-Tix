import pika
import json
import requests
import time
from app.database import SessionLocal
from app.models.order import Order
from app.rabbitmq import publish_order_cancelled

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
            # Compensate inventory via EVENT
            publish_order_cancelled(order.id, order.event_id, order.quantity)

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