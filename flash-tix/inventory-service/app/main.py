from app.database import SessionLocal
from fastapi import FastAPI
from app.database import engine,Base
from app.models.event import Event
from fastapi import HTTPException
from pydantic import BaseModel

from app.redis_client import redis_client

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
        event=Event(
            name="Rock Concert",
            total_tickets=100,
            available_tickets=100
        )
        db.add(event)
        db.commit()

    event=db.query(Event).first()
    redis_client.set(f"event:{event.id}:stock",event.available_tickets)

    db.close()

@app.get("/health")
def health_check():
    return {"status":"ok"}

@app.post("/inventory/reserve")
def reserve_ticket(request:ReserveRequest):
    stock_key=f"event:{request.event_id}:stock"

    #Atomic decrement
    remaining=redis_client.decr(stock_key)

    if remaining < 0:
        #Undo decrement
        redis_client.incr(stock_key)
        raise HTTPException(status_code=400,detail="Not enough tickets")

    #Update DB (No locking needed now)
    db=SessionLocal()

    try:
        event=db.query(Event).filter(Event.id==request.event_id).first()
        event.available_tickets-=request.quantity
        db.commit()

        # if not event:
        #     raise HTTPException(status_code=404,detail="Event not found")
        
        # if event.available_tickets<request.quantity:
        #     raise HTTPException(status_code=400,detail="Not enough tickets")
        
        # event.available_tickets -= request.quantity
        # db.commit()

        # return{
        #     "status":"RESERVED",
        #     "remaining_tickets":event.available_tickets
        # }

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