from fastapi import FastAPI
from app.database import engine,Base
from app.models.order import Order
from fastapi import HTTPException
from app.database import SessionLocal
import requests

from pydantic import BaseModel

class CreateOrderRequest(BaseModel):
    event_id:int
    quantity:int=1

app=FastAPI()

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health_check():
    return {"status":"ok"}

@app.post("/orders")
def create_order(request: CreateOrderRequest):
    db = SessionLocal()

    try:
        # Call Inventory Service
        response = requests.post(
            "http://inventory-service:8000/inventory/reserve",
            json={
                "event_id": request.event_id,
                "quantity": request.quantity
            }
        )

        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Inventory reservation failed")
        
        
        try:
            # create order
            order=Order(
                event_id=request.event_id,
                quantity=request.quantity,
                status="CREATED"
            )

            db.add(order)
            db.commit()
            db.refresh(order)

            return{
                "order_id":order.id,
                "status":order.status
            }
        except Exception as e:
            # Compensation
            requests.post(
                "http://inventory-service:8000/inventory/release",
                json={
                    "event_id": request.event_id,
                    "quantity": request.quantity
                }
            )
            raise
        
    finally:
        db.close()