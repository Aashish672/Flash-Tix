from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.models.event import Event, Reservation
from pydantic import BaseModel
import datetime

from app.redis_client import redis_client, stock_decrement_script
import threading
import time
from app.consumer import start_consumer
import asyncio
from sse_starlette.sse import EventSourceResponse
import json
from app.sse_manager import broadcaster

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/events/stream")
async def event_stream():
    async def generator():
        async for data in broadcaster.subscribe():
            yield {"data": json.dumps(data)}
    return EventSourceResponse(generator())

class ReserveRequest(BaseModel):
    event_id: int
    quantity: int=1

class EventCreate(BaseModel):
    name: str
    date: datetime.datetime
    price_inr: int
    total_tickets: int
    organizer_id: int

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

    db=SessionLocal()

    # Sync ALL events from Postgres to Redis on every startup
    all_events = db.query(Event).all()
    for event in all_events:
        redis_client.set(f"event:{event.id}:stock", event.available_tickets)
        print(f"Synced Event {event.id} ({event.name}) stock to Redis: {event.available_tickets}")

    db.close()

@app.get("/health")
def health_check():
    return {"status":"ok"}

@app.get("/events")
def list_events():
    db = SessionLocal()
    events = db.query(Event).all()
    db.close()
    return events

@app.post("/events")
async def create_event(event_data: EventCreate):
    db = SessionLocal()
    event = Event(
        name=event_data.name,
        date=event_data.date,
        price_inr=event_data.price_inr,
        organizer_id=event_data.organizer_id,
        total_tickets=event_data.total_tickets,
        available_tickets=event_data.total_tickets
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    # Initialize Redis stock
    redis_client.set(f"event:{event.id}:stock", event.available_tickets)
    db.close()
    
    # Broadcast new event
    try:
        await broadcaster.broadcast({"type": "event_created", "event_id": event.id, "stock": event.available_tickets})
    except Exception:
        pass
    return event

@app.get("/organizer/events/{organizer_id}")
def get_organizer_events(organizer_id: int):
    db = SessionLocal()
    events = db.query(Event).filter(Event.organizer_id == organizer_id).all()
    db.close()
    return events

@app.post("/inventory/reserve")
async def reserve_ticket(request:ReserveRequest):
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
        
        # Create Reservation record
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
        reservation = Reservation(
            event_id=request.event_id,
            quantity=request.quantity,
            status="PENDING",
            expires_at=expires_at
        )
        db.add(reservation)
        db.commit()
        db.refresh(reservation)

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
    
    # Broadcast stock change
    try:
        await broadcaster.broadcast({"type": "stock_update", "event_id": request.event_id, "stock": remaining})
    except Exception:
        pass

    return{
        "status":"RESERVED",
        "reservation_id": reservation.id,
        "expires_at": expires_at.isoformat(),
        "remaining_tickets":remaining
    }

def cleanup_expired_reservations():
    """Background task to release inventory from expired reservations."""
    while True:
        db = SessionLocal()
        try:
            now = datetime.datetime.utcnow()
            expired = (
                db.query(Reservation)
                .filter(Reservation.status == "PENDING")
                .filter(Reservation.expires_at < now)
                .all()
            )

            for res in expired:
                res.status = "EXPIRED"
                # Return to Postgres
                event = db.query(Event).filter(Event.id == res.event_id).first()
                if event:
                    event.available_tickets += res.quantity
                    # Return to Redis
                    stock_key = f"event:{res.event_id}:stock"
                    redis_client.incrby(stock_key, res.quantity)
                
                db.commit()
                print(f"Expired reservation {res.id} released.")
                
                # Broadcast release
                try:
                    loop = asyncio.get_event_loop()
                    asyncio.run_coroutine_threadsafe(
                        broadcaster.broadcast({"type": "stock_update", "event_id": res.event_id, "stock": event.available_tickets}),
                        loop
                    )
                except Exception:
                    pass

        except Exception as e:
            print(f"Error in cleanup: {e}")
            db.rollback()
        finally:
            db.close()
        
        time.sleep(30) # run every 30s

@app.on_event("startup")
def start_threads():
    # Cleanup thread
    cleanup_thread = threading.Thread(target=cleanup_expired_reservations, daemon=True)
    cleanup_thread.start()
    
    # RabbitMQ Consumer thread
    consumer_thread = threading.Thread(target=start_consumer, daemon=True)
    consumer_thread.start()

@app.post("/inventory/release")
async def release_ticket(request:ReserveRequest):
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

        # Broadcast release
        try:
            await broadcaster.broadcast({"type": "stock_update", "event_id": request.event_id, "stock": event.available_tickets})
        except Exception:
            pass

        return{
            "status":"RELEASED",
            "available_tickets":event.available_tickets
        }

    finally:
        db.close()