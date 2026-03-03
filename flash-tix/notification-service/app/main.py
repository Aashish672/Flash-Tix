from fastapi import FastAPI
import threading
from app.consumer import start_consumer

app = FastAPI()

@app.on_event("startup")
def start_threads():
    thread = threading.Thread(target=start_consumer, daemon=True)
    thread.start()

@app.get("/health")
def health():
    return {"status": "ok"}