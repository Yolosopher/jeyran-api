import { randomBytes } from "crypto";
import { Types } from "mongoose";
import path from "path";
import z from "zod";
import { BadRequestError } from "../errors/bad-request-error";
import { NextFunction, Response } from "express";
import { REFRESH_TOKEN_EXPIRATION_TIME_MS } from "../constants";

export function UID(strength?: number) {
  return randomBytes(strength || 16).toString("hex");
}

export const hoursToMilliseconds = (hrs: number) => hrs * 60 * 60 * 1000;

export const secondsToMilliseconds = (seconds: number) => seconds * 1000;

export const tokenExpiresInLessThan = (exp: number, hours: number) => {
  const expiresInMs = exp * 1000;
  const hoursAfterCertainTimeInMs = Date.now() + hoursToMilliseconds(hours);
  return expiresInMs < hoursAfterCertainTimeInMs;
};

export const tokenExpiresInLessThanHalfTime = (exp: number) => {
  const expiresInMs = exp * 1000;
  const dateNowPlusHalftime = Date.now() + REFRESH_TOKEN_EXPIRATION_TIME_MS / 2;
  return expiresInMs < dateNowPlusHalftime;
};

export const parseFileName = (
  filename: string
): {
  base: string;
  ext: string;
} => {
  return {
    base: path.basename(filename, path.extname(filename)),
    ext: path.extname(filename),
  };
};

export const toObjectId = (id: tID) => {
  return new Types.ObjectId(id.toString());
};

type DataFromEnum = "body" | "params" | "query";
export const validateZod = <T>(
  schema: z.Schema<T>,
  dataFrom: DataFromEnum = "body"
) => {
  return (req: Req, res: Response, next: NextFunction) => {
    const zodResult = schema.safeParse(req[dataFrom]);
    if (!zodResult.success) {
      throw new BadRequestError(zodResult.error.message);
    }
    next();
  };
};
