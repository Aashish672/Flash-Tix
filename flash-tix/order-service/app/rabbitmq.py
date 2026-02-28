import pika
import json
import time

def publish_order_created(order_id,event_id,quantity):
    retries = 20
    while retries > 0:
        try:
            connection=pika.BlockingConnection(pika.ConnectionParameters(host='rabbitmq', heartbeat=600))
            channel=connection.channel()
            channel.exchange_declare(
                exchange='order_exchange',
                exchange_type='direct',
                durable=True
            )

            message={
                "order_id":order_id,
                "event_id":event_id,
                "quantity":quantity
            }

            channel.basic_publish(
                exchange='order_exchange',
                routing_key='order_created',
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2
                )
            )

            connection.close()
            print(f"Successfully published order_created for order {order_id}")
            return
        except (pika.exceptions.AMQPConnectionError, pika.exceptions.ConnectionClosedByBroker):
            retries -= 1
            print(f"RabbitMQ connection failed in publish_order_created, retrying ({20-retries}/20) in 5s...")
            time.sleep(5)
        except Exception as e:
            print(f"Unexpected error in publish_order_created: {e}")
            break
    print(f"Failed to publish order_created event for order {order_id} after retries.")