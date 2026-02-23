import requests
import threading
import time 

start=time.time()

URL="http://localhost:8001/inventory/reserve"
TOTAL_REQUESTS=1000

success_count=0
failure_count=0

def book():
    global success_count,failure_count
    response=requests.post(URL, json={"event_id": 1, "quantity": 1})
    if response.status_code == 200:
        success_count+=1
    else:
        failure_count+=1

threads=[]

for _ in range(TOTAL_REQUESTS):
    t=threading.Thread(target=book)
    threads.append(t)
    t.start()

for t in threads:
    t.join()

end=time.time()
total_time=end-start
print("Total time:",total_time)
print("Success:",success_count)
print("Failed:",failure_count)