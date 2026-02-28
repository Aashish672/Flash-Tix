from fastapi import FastAPI
from app.database import engine,Base
from app.models.order import Order
from fastapi import HTTPException
from app.database import SessionLocal
import requests

from pydantic import BaseModel

from app.rabbitmq import publish_order_created
import threading
from app.consumer import start_consumer

class CreateOrderRequest(BaseModel):
    event_id:int
    quantity:int=1

app=FastAPI()

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
        
        
        # Step 2: Create Order in CREATED state
        order=Order(
            event_id=request.event_id,
            quantity=request.quantity,
            status="CREATED"
        )

        db.add(order)
        db.commit()
        db.refresh(order)

        #Step 3: Publish event to RabbitMQ
        publish_order_created(
            order.id,
            request.event_id,
            request.quantity
        )

        return{
            "order_id":order.id,
            "status":order.status,
            "message":"Order Created and Payment Processing Started"
        }

    
    #     # Step 3: Call Payment Service
    #     payment_response=requests.post(
    #         "http://payment-service:8000/payments",
    #         json={
    #             "order_id":order.id,
    #             "amount":100,
    #             "idempotency_key":f"order-{order.id}"
    #         }
    #     )

    #     if payment_response.status_code==200:
    #         order.status="CONFIRMED"
    #         db.commit()
    #         return{
    #             "order_id":order.id,
    #             "status":order.status
    #         }
    #     else:
    #         # Payment Failed: Compensate
    #         order.status = "FAILED"
    #         db.merge(order)
    #         db.commit()

    #         # Release Inventory
    #         requests.post(
    #             "http://inventory-service:8000/inventory/release",
    #             json={
    #                 "event_id":request.event_id,
    #                 "quantity":request.quantity
    #             }
    #         )

    #         raise HTTPException(status_code=400,detail="Payment Failed")
    
    finally:
        db.close()


