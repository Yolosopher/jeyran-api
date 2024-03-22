import { Response, NextFunction } from "express";
import { NotAuthorizedError } from "../errors/not-authorized-error";

export const isNotProd = (req: Req, res: Response, next: NextFunction) => {
  if (req.app.locals.NODE_ENV !== "production") {
    return next();
  }
  next(new NotAuthorizedError());
};
