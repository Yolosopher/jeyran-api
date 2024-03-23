import { RedisClientType, SetOptions } from "redis";
import redis from "../redis";

export class CacheService {
  constructor(private redis: RedisClientType) {}

  private parse(str: string) {
    return JSON.parse(str);
  }
  private stringify(data: any) {
    return JSON.stringify(data);
  }

  public async get(key: string) {
    const strValue = await this.redis.get(key);
    if (!strValue) {
      return null;
    }
    return this.parse(strValue);
  }

  public async set(key: string, value: any, options?: SetOptions) {
    return await this.redis.set(key, this.stringify(value), options);
  }
}

const cacheService = new CacheService(redis);
export default cacheService;
