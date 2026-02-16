from app.database import SessionLocal
from fastapi import FastAPI
from app.database import engine,Base
from app.models.event import Event
from fastapi import HTTPException

app=FastAPI()

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
@app.get("/health")
def health_check():
    return {"status":"ok"}

@app.post("/book/{event_id}")
def book_ticket(event_id: int):
    db=SessionLocal()
    
    try:
        event=(
            db.query(Event)
            .filter(Event.id==event_id)
            .with_for_update()
            .first()
        )

        if not event:
            raise HTTPException(status_code=404,detail="event not found")
        
        if event.available_tickets<=0:
            raise HTTPException(status_code=400,detail="Sold out")

        event.available_tickets-=1
        db.commit()

        remaining=event.available_tickets

        return{
            "message":"Ticket booked successfully",
            "remaining_tickets":remaining
        }
    finally:
        db.close()