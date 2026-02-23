import redis

redis_client=redis.Redis(
    host="redis",
    port=6379,
    decode_responses=True
)

stock_decrement_script=redis_client.register_script("""
local stock=tonumber(redis.call('GET',KEYS[1]))
local qty=tonumber(ARGV[1])
if stock and stock >= qty then
    return redis.call('DECRBY',KEYS[1],qty)
else
    return -1
end
""")
