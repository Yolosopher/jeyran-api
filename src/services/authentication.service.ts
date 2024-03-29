import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { RedisClientType } from "redis";
import redis from "../redis";
import { tokenExpiresInLessThanHalfTime } from "../utils";
import {
  ACCESS_TOKEN_EXPIRATION_TIME,
  REFRESH_TOKEN_EXPIRATION_TIME,
  REFRESH_TOKEN_EXPIRATION_TIME_MS,
} from "../constants";

export class AuthenticationService {
  private access_token_secret: string;
  private refresh_token_secret: string;

  constructor(private redisClient: RedisClientType) {
    this.access_token_secret = process.env.JWT_SECRET! || "access_token_secret";
    this.refresh_token_secret =
      process.env.JWT_SECRET_TWO! || "refresh_token_secret";
  }
  public generateRefreshToken(payload: JWT_PAYLOAD) {
    return jwt.sign(payload, this.refresh_token_secret, {
      expiresIn: REFRESH_TOKEN_EXPIRATION_TIME,
    });
  }

  public generateAccessToken(payload: JWT_PAYLOAD) {
    return jwt.sign(payload, this.access_token_secret, {
      expiresIn: ACCESS_TOKEN_EXPIRATION_TIME,
    });
  }

  public verifyAccessToken(token: string): {
    success: boolean;
    payload?: any;
    message?: string;
    expired?: boolean;
  } {
    try {
      const result = jwt.verify(token, this.access_token_secret);

      return {
        success: true,
        payload: result,
      };
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        return { success: false, message: "Token expired", expired: true };
      }
      return { success: false, message: "Not authorized" };
    }
  }

  public async verifyRefreshToken(token: string): Promise<
    | {
        success: true;
        payload: any;
        accessToken: string;
        refreshToken: string;
      }
    | { success: false; message: string }
  > {
    try {
      // check if token is blacklisted
      const isValid = await this.redisClient.get(token);
      if (!isValid) {
        throw new Error("Token is blacklisted");
      }
      const result = jwt.verify(token, this.refresh_token_secret) as JwtPayload;

      let refreshToken = token;
      // if (tokenExpiresInLessThan(result!.exp!, 24)) {
      if (tokenExpiresInLessThanHalfTime(result!.exp!)) {
        // generate new refresh_token
        const newTokens = await this.generateTokens({
          id: result.id,
          username: result.username,
          role: result.role,
        });
        await this.blacklistRefreshToken(token);

        return {
          success: true,
          payload: result,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
        };
      }
      return {
        success: true,
        payload: result,
        accessToken: this.generateAccessToken({
          id: result.id,
          username: result.username,
          role: result.role,
        }),
        refreshToken,
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  public async blacklistRefreshToken(token: string) {
    try {
      await this.redisClient.del(token);
    } catch (error) {
      // do nothing
    }
  }

  public hashPassword(password: string) {
    return bcrypt.hashSync(password, 10);
  }

  public comparePassword(password: string, hashedPassword: string) {
    return bcrypt.compareSync(password, hashedPassword);
  }

  public async generateTokens(
    payload: JWT_PAYLOAD
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    await this.redisClient.set(refreshToken, "1", {
      PX: REFRESH_TOKEN_EXPIRATION_TIME_MS,
    });
    return {
      accessToken,
      refreshToken,
    };
  }
}

const authenticationService = new AuthenticationService(redis);

export default authenticationService;
