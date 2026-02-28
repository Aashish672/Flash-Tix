import pika
import json

def publish_order_created(order_id,event_id,quantity):
    connection=pika.BlockingConnection(pika.ConnectionParameters(host='rabbitmq'))
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