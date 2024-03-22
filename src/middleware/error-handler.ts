import { Request, Response, NextFunction } from "express";
import { CustomError } from "../errors/custom-error";
import { NotFoundError } from "../errors/not-found-error";
import { NotAuthorizedError } from "../errors/not-authorized-error";
import { ZodError } from "zod";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ZodError) {
    console.log(err);
    const payload: any = { error: err.message };
    return res.status(400).json(payload);
  }
  if (err instanceof NotAuthorizedError) {
    const payload: any = { error: err.message };
    if (err.refresh_required) {
      payload.refresh_required = err.refresh_required;
    }
    return res.status(err.statusCode).json(payload);
  }
  if (err instanceof CustomError) {
    const payload: any = { error: err.message };

    return res.status(err.statusCode).json(payload);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(err);
  }
  res.status(500).send({ error: "something went wrong" });
};

export const errorHandlerForSocket = (
  socket: any,
  next: (err?: Error | undefined) => void
) => {};

export const invalidRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next(new NotFoundError("Not found!"));
};
