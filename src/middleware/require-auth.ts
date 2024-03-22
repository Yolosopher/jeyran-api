import { Response, NextFunction } from "express";
import { NotAuthorizedError } from "../errors/not-authorized-error";

export const requireAuth = (req: Req, res: Response, next: NextFunction) => {
  if (!req.currentUser) {
    const newError = new NotAuthorizedError("Not authorized", true);
    return next(newError);
  }

  next();
};

export const requireAuthForSocket = async (
  socket: Sock,
  next: (err?: Error | undefined) => void
) => {
  if (!socket.currentUser) {
    const newError = new NotAuthorizedError("Not authorized", true);
    return next(newError);
  }

  next();
};
