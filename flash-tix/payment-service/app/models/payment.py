from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Payment(Base):
    __tablename__="payments"

    id=Column(Integer,primary_key=True,index=True)
    order_id=Column(Integer,nullable=False)

    amount=Column(Integer,nullable=False)

    idempotency_key=Column(String,unique=True,nullable=False)

    status=Column(String,nullable=False)

    created_at=Column(DateTime(timezone=True),server_default=func.now())