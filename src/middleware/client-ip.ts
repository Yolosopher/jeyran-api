import { Response, NextFunction } from "express";

export const watchClientIp = (req: Req, res: Response, next: NextFunction) => {
  const ip =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "";

  req.clientIp = ip;
  next();
};
