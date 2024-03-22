import { Response, NextFunction } from "express";
import authenticationService from "../services/authentication.service";
import { NotAuthorizedError } from "../errors/not-authorized-error";
import { hoursToMilliseconds } from "../utils";
import cookie from "cookie";
import expressAsyncHandler from "express-async-handler";
import authService from "../routes/auth/auth.service";
import {
  ACCESS_TOKEN_EXPIRATION_TIME_MS,
  REFRESH_TOKEN_EXPIRATION_TIME_MS,
} from "../constants";
import sessionService from "../services/session.service";

const handleTokensVerification = async ({
  accessToken,
  refreshToken,
  forSockets,
}: {
  accessToken?: string;
  refreshToken?: string;
  forSockets: boolean;
}): Promise<{
  success: boolean;
  auth: boolean;
  currentUser?: any;
  accessToken?: string;
  refreshToken?: string;
  error?: any;
  newTokens?: boolean;
}> => {
  if (!accessToken && !refreshToken) {
    return {
      success: true,
      auth: false,
    };
  }

  try {
    let success: boolean = false,
      payload: any = null,
      message: string = "";
    // const accessToken = req.headers.authorization.split(" ")[1];
    if (accessToken) {
      let result = authenticationService.verifyAccessToken(accessToken);
      success = result.success;
      payload = result.payload;
      if (result.message) {
        message = result.message;
      }
    }
    if (!success) {
      if (!refreshToken) {
        if (forSockets) {
          throw new NotAuthorizedError("token-refresh-required");
        }
        throw new NotAuthorizedError(message ?? "Invalid token");
      } else {
        // check refresh token
        const { tokens, user } = await authService.reCreateAccessToken(
          refreshToken
        );

        return {
          success: true,
          auth: true,
          currentUser: user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          newTokens: true,
        };
      }
    }
    return {
      success: true,
      auth: true,
      currentUser: payload,
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  } catch (err: any) {
    return {
      success: false,
      auth: false,
      error: err,
    };
  }
};

export const currentUser = async (
  req: Req,
  res: Response,
  next: NextFunction
) => {
  const accessTokenO = req?.cookies?.accessToken;
  const refreshTokenO = req?.cookies?.refreshToken;

  const {
    success,
    auth,
    error,
    currentUser,
    accessToken,
    refreshToken,
    newTokens,
  } = await handleTokensVerification({
    accessToken: accessTokenO,
    refreshToken: refreshTokenO,
    forSockets: false,
  });

  if (success && !auth) {
    return next();
  }

  if (!success) {
    // clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    delete req.currentUser;
    return next(error);
  }

  if (currentUser) {
    if (newTokens) {
      // set cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        maxAge: ACCESS_TOKEN_EXPIRATION_TIME_MS,
        sameSite: "none",
        secure: true,
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: REFRESH_TOKEN_EXPIRATION_TIME_MS,
        sameSite: "none",
        secure: true,
      });
    }
    req.accessToken = accessToken;
    req.refreshToken = refreshToken;
    req.currentUser = currentUser;

    return next();
  }
};

export const currentUserForSocket = async (
  socket: Sock,
  accessTokenO: null | string
): Promise<{
  error: false | string;
  currentUser?: any;
  accessToken?: string;
}> => {
  const { success, auth, error, currentUser, accessToken, newTokens } =
    await handleTokensVerification({
      accessToken: accessTokenO ?? "",
      forSockets: true,
    });

  if (success && !auth) {
    return { error: false };
  }

  if (!success) {
    return { error: error.message };
  }

  if (currentUser) {
    return {
      error: false,
      currentUser,
      accessToken,
    };
  }
  throw new NotAuthorizedError("Not authorized");
};
export const analyzeCurrentUser = async (
  socket: Sock,
  accessToken: string | null
) => {
  const result = await currentUserForSocket(socket, accessToken);

  if (result.error) {
    throw new NotAuthorizedError(result.error);
  }

  socket.currentUser = result.currentUser;
  const currentUser = result.currentUser;

  // save session to redis
  if (currentUser.username) {
    const result = await sessionService.addUserSession({
      username: currentUser.username,
      socketId: socket.id,
    });
    // check if session was added successfully
    if (!result) {
      throw new Error("Failed to add session");
    } else {
      console.log(socket.id + " connected");
    }
  }

  return false;
};

export const useSocketAuth = async (socket: Sock) => {
  if (!socket.currentUser) {
    throw new NotAuthorizedError("Not authorized", true);
  }
};
