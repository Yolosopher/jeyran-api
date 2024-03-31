import redis from "../redis";
import { hoursToMilliseconds } from "../utils";
import { UserSessionDto, UserSessionPopDto } from "./types.dto";

export class SessionService {
  constructor() {}

  private userIdKey(userId: string) {
    // returns socketId from db
    return `${userId}:sessions-jeyran`;
  }
  private everyoneIdKey() {
    // returns socketId from db
    return `*:sessions-jeyran`;
  }

  private socketIdKey(socketId: string) {
    // returns userId from db
    return `${socketId}:userId-jeyran`;
  }

  private async setUserIdToSessionKey(
    socketId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const socketIdKey = this.socketIdKey(socketId);
      await redis.set(socketIdKey, userId, { PX: hoursToMilliseconds(8 * 24) });
      return true;
    } catch (error) {
      return false;
    }
  }
  private async delUserIdFromSessionKey(params: {
    socketIdKey?: string;
    socketId?: string;
  }): Promise<boolean> {
    try {
      const socketIdKey = params.socketIdKey
        ? params.socketIdKey
        : this.socketIdKey(params.socketId!);
      await redis.del(socketIdKey);
      return true;
    } catch (error) {
      return false;
    }
  }
  public async addUserSession({
    userId,
    socketId,
  }: UserSessionDto): Promise<boolean> {
    try {
      const userIdKey = this.userIdKey(userId);

      // add session to user's sessions
      await redis.SADD(userIdKey, socketId);

      // add user to session
      await this.setUserIdToSessionKey(socketId, userId);

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
      await this.delUserIdFromSessionKey({ socketIdKey });

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

  public async logEveryoneOut(): Promise<boolean> {
    try {
      const queryKeyOfEverySession = this.everyoneIdKey();

      const keys = await redis.keys(queryKeyOfEverySession);
      for (const key of keys) {
        const userId = key.split(":")[0];
        const sessions = await this.getUserSessions(userId);
        if (sessions) {
          for (const socketId of sessions) {
            await this.popUserSession({ userId, socketId });
          }
        }
      }

      return true;
    } catch (error) {
      console.log("logEveryoneOut error: ", error);
      return false;
    }
  }
}

const sessionService = new SessionService();

export default sessionService;
