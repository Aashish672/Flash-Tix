import pika
import json
import random
import time
from app.database import SessionLocal
from app.models.payment import Payment

def callback(ch,method,properties,body):
    try:
        data=json.loads(body)
        order_id=data["order_id"]
    except Exception as e:
        print(f"Error decoding JSON message: {e}. Body: {body}")
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    db=SessionLocal()

    try:
        # IDEMPOTENCY: Check if payment already exists
        existing_payment = db.query(Payment).filter(Payment.order_id == order_id).first()
        if existing_payment:
            print(f"Payment already processed for order {order_id}. Skipping.")
            db.close()
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        success=random.choice([True,True,True,False])

        payment=Payment(
            order_id=order_id,
            amount=100,
            idempotency_key=f"order-{order_id}",
            status="success" if success else "failed"
        )

        db.add(payment)
        db.commit()

        print(f"Processed payment for order {order_id}: {payment.status}")
        
        # Publish result AFTER commit. If this fails, we don't ack.
        publish_payment_result(order_id, payment.status)
        
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"Error in payment callback for order {order_id}: {e}. NO-ACKing message.")
        db.rollback()
        # No message acknowledgement here means it stays in the queue.
    finally:
        db.close()

def start_consumer():
    while True:
        try:
            connection=pika.BlockingConnection(
                pika.ConnectionParameters(host='rabbitmq', heartbeat=600)
            )
            channel=connection.channel()

            channel.exchange_declare(
                exchange='order_exchange',
                exchange_type='direct',
                durable=True
            )

            channel.queue_declare(queue='payment_queue',durable=True)

            channel.queue_bind(
                exchange='order_exchange',
                queue='payment_queue',
                routing_key='order_created'
            )

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue='payment_queue',on_message_callback=callback)

            print("Payment Service waiting for messages")
            channel.start_consuming()
        except (pika.exceptions.AMQPConnectionError, pika.exceptions.ConnectionClosedByBroker):
            print("RabbitMQ connection failed in Payment Service, retrying in 5 seconds...")
            time.sleep(5)
        except Exception as e:
            print(f"Unexpected error in Payment Service consumer: {e}")
            time.sleep(5)


def publish_payment_result(order_id,status):
    retries = 20
    while retries > 0:
        try:
            connection=pika.BlockingConnection(
                pika.ConnectionParameters(host='rabbitmq', heartbeat=600)
            )
            channel=connection.channel()

            channel.exchange_declare(
                exchange='payment_exchange',
                exchange_type='direct',
                durable=True
            )

            message={
                "order_id":order_id,
                "status":status
            }

            routing_key="payment_success" if status=="success" else "payment_failed"

            channel.basic_publish(
                exchange='payment_exchange',
                routing_key=routing_key,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2
                )
            )

            connection.close()
            print(f"Published payment result for order {order_id}: {status}")
            return
        except (pika.exceptions.AMQPConnectionError, pika.exceptions.ConnectionClosedByBroker):
            retries -= 1
            print(f"RabbitMQ connection failed in publish_payment_result, retrying ({20-retries}/20) in 5s...")
            time.sleep(5)
        except Exception as e:
            # Re-raise to trigger the NO-ACK logic in callback
            raise e
    
    raise Exception(f"Failed to publish payment result for order {order_id} after retries.")
