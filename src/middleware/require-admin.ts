import { Response, NextFunction } from "express";
import { NotAuthorizedError } from "../errors/not-authorized-error";
import { Role } from "../global_types.dto";

export const requireAdmin = (req: Req, res: Response, next: NextFunction) => {
  if (
    !req.currentUser ||
    !req.session?.jwt ||
    Number(req.currentUser.role) < Role["ADMIN"]
  ) {
    throw new NotAuthorizedError();
  }
  next();
};

export const requireSuperAdmin = (
  req: Req,
  res: Response,
  next: NextFunction
) => {
  if (!req.currentUser || Number(req.currentUser.role) < Role["SUPER_ADMIN"]) {
    throw new NotAuthorizedError();
  }
  next();
};

export const requireVerifiedUser = (
  req: Req,
  res: Response,
  next: NextFunction
) => {
  if (!req.currentUser || !req.session?.jwt || !req.currentUser.isVerified) {
    throw new NotAuthorizedError("Please verify your email address first.");
  }
  next();
};
