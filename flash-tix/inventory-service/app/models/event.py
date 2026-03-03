from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.database import Base
import datetime

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    date = Column(DateTime)
    price_inr = Column(Integer)
    organizer_id = Column(Integer) # Linked to Auth Service User ID
    total_tickets = Column(Integer)
    available_tickets = Column(Integer)

class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    quantity = Column(Integer)
    status = Column(String) # PENDING, CONFIRMED, EXPIRED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime)
