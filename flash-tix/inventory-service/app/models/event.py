from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Event(Base):
    __tablename__="events"

    id=Column(Integer,primary_key=True,index=True)
    name=Column(String,nullable=False)

    total_tickets=Column(Integer,nullable=False)
    available_tickets=Column(Integer,nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
