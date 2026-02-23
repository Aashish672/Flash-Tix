from app.database import SessionLocal
from fastapi import FastAPI
from app.database import engine,Base
from app.models.event import Event
from fastapi import HTTPException
from pydantic import BaseModel

from app.redis_client import redis_client, stock_decrement_script

app=FastAPI()

class ReserveRequest(BaseModel):
    event_id: int
    quantity: int=1

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

    db=SessionLocal()
    existing_event=db.query(Event).first()
    if not existing_event:
        existing_event=Event(
            name="Rock Concert",
            total_tickets=100,
            available_tickets=100
        )
        db.add(existing_event)
        db.commit()
        db.refresh(existing_event)

    # Always sync Redis from Postgres on every startup
    redis_client.set(f"event:{existing_event.id}:stock", existing_event.available_tickets)

    db.close()

@app.get("/health")
def health_check():
    return {"status":"ok"}

@app.post("/inventory/reserve")
def reserve_ticket(request:ReserveRequest):
    stock_key=f"event:{request.event_id}:stock"

    # Step 1: Redis Atomic Decrement via Lua (respects quantity, no race condition)
    remaining=stock_decrement_script(keys=[stock_key], args=[request.quantity])

    # Step 2: Protect DB with Row-level Locking
    db=SessionLocal()

    try:
        event=(
            db.query(Event)
            .filter(Event.id == request.event_id)
            .with_for_update()
            .first()
        )

        if not event or event.available_tickets < request.quantity:
            # if DB says sold out or insufficient, restore Redis
            redis_client.incrby(stock_key, request.quantity)
            raise HTTPException(status_code=400,detail="Sold Out (DB check)")
        
        event.available_tickets -= request.quantity
        db.commit()

    except HTTPException:
        # HTTPException already restored Redis above — just rollback & re-raise
        db.rollback()
        raise
    except Exception:
        # Unexpected DB error — restore Redis and rollback
        db.rollback()
        redis_client.incrby(stock_key, request.quantity)
        raise

    finally:
        db.close()
    
    return{
        "status":"RESERVED",
        "remaining_tickets":remaining
    }

@app.post("/inventory/release")
def release_ticket(request:ReserveRequest):
    db=SessionLocal()

    try:
        event=(
            db.query(Event)
            .filter(Event.id==request.event_id)
            .with_for_update()
            .first()
        )

        if not event:
            raise HTTPException(status_code=404,detail="Event not found")

        event.available_tickets+=request.quantity
        db.commit()

        return{
            "status":"RELEASED",
            "available_tickets":event.available_tickets
        }

    finally:
        db.close()