from fastapi import FastAPI, HTTPException
from app.database import engine, Base, SessionLocal
from app.models.payment import Payment
from pydantic import BaseModel
import random

app=FastAPI()

class PaymentRequest(BaseModel):
    order_id: int
    amount: int
    idempotency_key: str

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health_check():
    return {"status":"ok"}

@app.post("/payments")
def process_payment(request:PaymentRequest):
    db=SessionLocal()

    try:

        # Check for duplicate payment
        existing = db.query(Payment).filter(
            Payment.idempotency_key == request.idempotency_key
        ).first()

        if existing:
            return {
                "payment_id": existing.id,
                "status": existing.status,
                "message": "Idempotent replay"
            }
        #Simulate Random Failure
        success=random.choice([True,True,True,False]) # 75% Success

        payment=Payment(
            order_id=request.order_id,
            amount=request.amount,
            idempotency_key=request.idempotency_key,
            status="success" if success else "failed"
        )

        db.add(payment)
        db.commit()
        db.refresh(payment)

        if not success:
            raise HTTPException(status_code=400,detail="Payment Failed")

        return {
            "payment_id":payment.id,
            "status":payment.status
        }
    
    finally:
        db.close()