import redis from "../redis";
import { hoursToMilliseconds } from "../utils";
import { UserSessionDto, UserSessionPopDto } from "./types.dto";

export class SessionService {
  constructor() {}

  private userIdKey(userId: string) {
    // returns socketId from db
    return `${userId}:sessions`;
  }

  private socketIdKey(socketId: string) {
    // returns userId from db
    return `${socketId}:userId`;
  }

  public async addUserSession({
    userId,
    socketId,
  }: UserSessionDto): Promise<boolean> {
    try {
      const userIdKey = this.userIdKey(userId);
      const socketIdKey = this.socketIdKey(socketId);

      // add session to user's sessions
      await redis.SADD(userIdKey, socketId);

      // add user to session
      await redis.set(socketIdKey, userId, { PX: hoursToMilliseconds(8 * 24) });

      return true;
    } catch (error) {
      return false;
    }
  }

  public async popUserSession({
    userId,
    socketId,
  }: UserSessionPopDto): Promise<
    { success: true; userId: string } | { success: false }
  > {
    try {
      const socketIdKey = this.socketIdKey(socketId); // returns userId from db

      let userIdKey = "", // returns socketId from db
        realUserId = "";

      if (userId) {
        realUserId = userId;
        userIdKey = this.userIdKey(userId);
      } else {
        const foundUserId = await redis.get(socketIdKey);
        if (!foundUserId) {
          throw new Error("foundUserId error....");
        }

        userIdKey = this.userIdKey(foundUserId);
        realUserId = foundUserId;
      }

      // remove user from session
      await redis.del(socketIdKey);

      // remove session from user's sessions
      await redis.SREM(userIdKey, socketId);

      return { success: true, userId: realUserId };
    } catch (error) {
      return { success: false };
    }
  }

  public async getUserSessions(userId: string): Promise<string[] | null> {
    try {
      const userIdKey = this.userIdKey(userId);
      const sessions = await redis.SMEMBERS(userIdKey);
      return sessions;
    } catch (error) {
      return null;
    }
  }

  public async isOnline(userId: string): Promise<boolean> {
    try {
      const userIdKey = this.userIdKey(userId);
      const sessions = await redis.SMEMBERS(userIdKey);
      return sessions.length > 0;
    } catch (error) {
      return false;
    }
  }
}

const sessionService = new SessionService();

export default sessionService;
