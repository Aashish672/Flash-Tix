import asyncio
import json

class Broadcaster:
    def __init__(self):
        self.listeners = set()

    async def subscribe(self):
        queue = asyncio.Queue()
        self.listeners.add(queue)
        try:
            while True:
                data = await queue.get()
                yield data
        finally:
            self.listeners.remove(queue)

    async def broadcast(self, data):
        for queue in self.listeners:
            await queue.put(data)

broadcaster = Broadcaster()
