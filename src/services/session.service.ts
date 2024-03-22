import redis from "../redis";
import { UserSessionDto } from "./types.dto";

export class SessionService {
  constructor() {}

  private sessionKey(username: string) {
    return `${username}:sessions`;
  }

  public async addUserSession({
    username,
    socketId,
  }: UserSessionDto): Promise<boolean> {
    try {
      const key = this.sessionKey(username);

      // add session to user's sessions
      await redis.SADD(key, socketId);
      return true;
    } catch (error) {
      return false;
    }
  }

  public async popUserSession({
    username,
    socketId,
  }: UserSessionDto): Promise<boolean> {
    try {
      const key = this.sessionKey(username);

      // remove session from user's sessions
      await redis.SREM(key, socketId);
      return true;
    } catch (error) {
      return false;
    }
  }

  public async getUserSessions(username: string): Promise<string[] | null> {
    try {
      const key = this.sessionKey(username);
      const sessions = await redis.SMEMBERS(key);
      return sessions;
    } catch (error) {
      return null;
    }
  }
}

const sessionService = new SessionService();

export default sessionService;
