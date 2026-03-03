from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Order(Base):
    __tablename__="orders"

    id=Column(Integer,primary_key=True,index=True)
    event_id=Column(Integer,nullable=False)
    user_id=Column(Integer)
    customer_name=Column(String)
    customer_email=Column(String)
    quantity=Column(Integer,nullable=False)
    price_paid_inr=Column(Integer)
    idempotency_key=Column(String, unique=True, index=True)

    status=Column(String,nullable=False) # CREATED, PENDING_PAYMENT, CONFIRMED, FAILED, CANCELLED

    created_at=Column(DateTime(timezone=True),server_default=func.now())