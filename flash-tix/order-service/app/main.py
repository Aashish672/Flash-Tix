from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.models.order import Order
import requests

from pydantic import BaseModel

from app.rabbitmq import publish_order_created
import threading
from app.consumer import start_consumer

class CreateOrderRequest(BaseModel):
    event_id: int
    user_id: int
    customer_name: str
    customer_email: str
    quantity: int = 1
    price_paid_inr: int
    idempotency_key: str

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

    thread=threading.Thread(target=start_consumer)
    thread.daemon=True
    thread.start()

@app.get("/health")
def health_check():
    return {"status":"ok"}

@app.post("/orders")
def create_order(request: CreateOrderRequest):
    db = SessionLocal()

    try:
        # Step 0: Check Idempotency
        existing_order = db.query(Order).filter(Order.idempotency_key == request.idempotency_key).first()
        if existing_order:
            return {
                "order_id": existing_order.id,
                "status": existing_order.status,
                "message": "Idempotent replay"
            }

        # Step 1: Reserve Inventory
        inventory_response = requests.post(
            "http://inventory-service:8000/inventory/reserve",
            json={
                "event_id": request.event_id,
                "quantity": request.quantity
            }
        )

        if inventory_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Inventory reservation failed")
        
        inventory_data = inventory_response.json()
        
        # Step 2: Create Order in PENDING_PAYMENT state
        order = Order(
            event_id=request.event_id,
            user_id=request.user_id,
            customer_name=request.customer_name,
            customer_email=request.customer_email,
            quantity=request.quantity,
            price_paid_inr=request.price_paid_inr,
            idempotency_key=request.idempotency_key,
            status="PENDING_PAYMENT"
        )

        db.add(order)
        db.commit()
        db.refresh(order)

        # Step 3: Publish event to RabbitMQ for payment processing
        publish_order_created(
            order.id,
            request.event_id,
            request.quantity
        )

        return {
            "order_id": order.id,
            "status": order.status,
            "reservation_id": inventory_data.get("reservation_id"),
            "expires_at": inventory_data.get("expires_at"),
            "message": "Order Created and Payment Processing Started"
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        db.close()

@app.get("/organizer/attendees/{event_id}")
def get_event_attendees(event_id: int):
    # In a real app, we'd verify the requester is the organizer of this event_id
    db = SessionLocal()
    orders = db.query(Order).filter(
        Order.event_id == event_id,
        Order.status == "CONFIRMED"
    ).all()
    db.close()
    return orders

@app.get("/orders/user/{user_id}")
def get_user_orders(user_id: int):
    db = SessionLocal()
    orders = db.query(Order).filter(Order.user_id == user_id).all()
    db.close()
    return orders

@app.get("/orders/{order_id}")
def get_order(order_id: int):
    db = SessionLocal()
    order = db.query(Order).filter(Order.id == order_id).first()
    db.close()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
