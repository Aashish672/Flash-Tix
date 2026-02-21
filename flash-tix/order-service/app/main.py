from fastapi import FastAPI
from app.database import engine,Base
from app.models.order import Order

app=FastAPI()

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health_check():
    return {"status":"ok"}