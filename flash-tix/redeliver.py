import pika
import json

def publish_duplicate():
    connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost', port=5672))
    channel = connection.channel()
    
    message = {
        "order_id": 12,
        "event_id": 1,
        "quantity": 1
    }
    
    channel.basic_publish(
        exchange='order_exchange',
        routing_key='order_created',
        body=json.dumps(message),
        properties=pika.BasicProperties(delivery_mode=2)
    )
    connection.close()
    print("Redelivered duplicate message for Order 12")

if __name__ == "__main__":
    publish_duplicate()
