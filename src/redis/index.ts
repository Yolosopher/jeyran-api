import { RedisClientType, createClient } from "redis";

const redis: RedisClientType = createClient();

export default redis;
