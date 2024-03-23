import redis from "../redis";
import { UserSessionDto } from "./types.dto";

export class SessionService {
  constructor() {}

  private sessionKey(userId: string) {
    return `${userId}:sessions`;
  }

  public async addUserSession({
    userId,
    socketId,
  }: UserSessionDto): Promise<boolean> {
    try {
      const key = this.sessionKey(userId);

      // add session to user's sessions
      await redis.SADD(key, socketId);
      return true;
    } catch (error) {
      return false;
    }
  }

  public async popUserSession({
    userId,
    socketId,
  }: UserSessionDto): Promise<boolean> {
    try {
      const key = this.sessionKey(userId);

      // remove session from user's sessions
      console.log(await redis.SREM(key, socketId));
      return true;
    } catch (error) {
      return false;
    }
  }

  public async getUserSessions(userId: string): Promise<string[] | null> {
    try {
      const key = this.sessionKey(userId);
      const sessions = await redis.SMEMBERS(key);
      return sessions;
    } catch (error) {
      return null;
    }
  }
}

const sessionService = new SessionService();

export default sessionService;
