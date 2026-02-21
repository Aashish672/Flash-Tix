from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Order(Base):
    __tablename__="orders"

    id=Column(Integer,primary_key=True,index=True)
    event_id=Column(Integer,nullable=False)
    quantity=Column(Integer,nullable=False)

    status=Column(String,nullable=False) # CREATED,CONFIRMED,CANCELLED

    created_at=Column(DateTime(timezone=True),server_default=func.now())