import pika
import json
import time
import os
import smtplib
import ssl
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.mailtrap.io")
SMTP_PORT = int(os.getenv("SMTP_PORT", "2525"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", "tickets@flashtix.com")

def send_real_email(to_email, subject, body_html):
    if not SMTP_USER or not SMTP_PASSWORD:
        print(" [NOTIFICATION] SMTP credentials missing in .env. Skipping real email.")
        return False

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = SMTP_FROM
    message["To"] = to_email

    part = MIMEText(body_html, "html")
    message.attach(part)

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_PORT == 587:
                server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, message.as_string())
        return True
    except Exception as e:
        print(f" [NOTIFICATION] Failed to send email: {e}")
        return False

def callback(ch, method, properties, body):
    try:
        data = json.loads(body)
        order_id = data.get("order_id")
        status = data.get("status")

        # Fetch Order details from Order Service
        order_res = requests.get(f"http://order-service:8000/orders/{order_id}")
        if order_res.status_code != 200:
            print(f" [NOTIFICATION] Could not fetch order data for #{order_id}")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return
        
        order_data = order_res.json()
        customer_email = order_data.get("customer_email")
        customer_name = order_data.get("customer_name")
        event_id = order_data.get("event_id")

        # Fetch Event details from Inventory Service
        event_name = "Your Event"
        try:
            event_res = requests.get("http://inventory-service:8000/events")
            if event_res.status_code == 200:
                events = event_res.json()
                target_event = next((e for e in events if e['id'] == event_id), None)
                if target_event:
                    event_name = target_event['name']
        except:
            pass

        subject = f"Order {status.upper()}: {event_name} - FlashTix"
        
        html = f"""
        <html>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; line-height: 1.6;">
            <div style="max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 24px; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #6d28d9; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -0.025em;">FlashTix</h1>
                    <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Your Premium Event Gateway</p>
                </div>
                
                <div style="margin-bottom: 32px;">
                    <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">Hello {customer_name},</h2>
                    <p style="margin-bottom: 16px;">
                        {'Great news! Your booking is confirmed.' if status == 'success' else 'We regret to inform you that your booking could not be completed.'}
                    </p>
                </div>

                <div style="background: #f8fafc; border: 1px solid #f1f5f9; padding: 24px; border-radius: 16px; margin-bottom: 32px;">
                    <h3 style="font-size: 16px; font-weight: 700; margin-top: 0; margin-bottom: 16px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Order Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">Event:</td>
                            <td style="padding: 8px 0; font-weight: 600; text-align: right;">{event_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">Order ID:</td>
                            <td style="padding: 8px 0; font-weight: 600; text-align: right;">#{order_id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">Quantity:</td>
                            <td style="padding: 8px 0; font-weight: 600; text-align: right;">{order_data.get('quantity')} Ticket(s)</td>
                        </tr>
                        <tr style="border-top: 1px solid #e2e8f0;">
                            <td style="padding: 16px 0 0 0; color: #1a1a1a; font-weight: 700;">Total Paid:</td>
                            <td style="padding: 16px 0 0 0; font-weight: 900; text-align: right; color: #6d28d9; font-size: 20px;">₹{order_data.get('price_paid_inr')}</td>
                        </tr>
                    </table>
                </div>

                <div style="text-align: center; margin-bottom: 32px;">
                    <a href="http://localhost:3000/profile" style="display: inline-block; background: #6d28d9; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; transition: background 0.2s;">
                        View My Tickets
                    </a>
                </div>

                <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; text-align: center; color: #94a3b8; font-size: 12px;">
                    <p style="margin: 0;">This is an automated transactional email from FlashTix.</p>
                    <p style="margin: 4px 0;">&copy; 2026 FlashTix Inc. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        print(f" [NOTIFICATION] Sending {status} email to {customer_email} for #{order_id}")
        sent = send_real_email(customer_email, subject, html)
        
        if sent:
            print(f" [NOTIFICATION] Real email sent successfully to {customer_email}")
        else:
            print(" [NOTIFICATION] Falling back to console preview:")
            print(f" SUBJECT: {subject}")
            print(f" TO: {customer_email}")
            print(" (HTML Template printed to logs above)")

        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        print(f"Error in Notification callback: {e}")

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

            channel.queue_declare(queue='notification_queue', durable=True)

            # Bind for both success and failure
            channel.queue_bind(
                exchange='payment_exchange',
                queue='notification_queue',
                routing_key='payment_success'
            )
            channel.queue_bind(
                exchange='payment_exchange',
                queue='notification_queue',
                routing_key='payment_failed'
            )

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue='notification_queue', on_message_callback=callback)

            print("Notification Service waiting for payment events...")
            channel.start_consuming()
        except (pika.exceptions.AMQPConnectionError, pika.exceptions.ConnectionClosedByBroker):
            print("RabbitMQ connection failed in Notification Service, retrying in 5 seconds...")
            time.sleep(5)
        except Exception as e:
            print(f"Unexpected error in Notification Service consumer: {e}")
            time.sleep(5)
