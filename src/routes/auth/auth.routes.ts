import { Response, Router } from "express";
import expressAsyncHandler from "express-async-handler";
import z from "zod";
import authService from "./auth.service";
import { BadRequestError } from "../../errors/bad-request-error";
import { validateZod } from "../../utils";
import {
  ACCESS_TOKEN_EXPIRATION_TIME_MS,
  REFRESH_TOKEN_EXPIRATION_TIME_MS,
} from "../../constants";
import { currentUser } from "../../middleware/current-user";
import { NotAuthorizedError } from "../../errors/not-authorized-error";

const UserSchemaValidator = z.object({
  username: z.string().min(3).max(255),
  password: z.string().min(6).max(255),
});

const authRoutes = Router();

authRoutes.post(
  "/register",
  validateZod(UserSchemaValidator, "body"),
  expressAsyncHandler(async (req: Req, res: Response) => {
    const { username, password } = req.body;
    const user = await authService.registerUser(username, password);
    res.status(201).json(user);
  })
);

authRoutes.post(
  "/login",
  validateZod(UserSchemaValidator, "body"),
  expressAsyncHandler(async (req: Req, res: Response) => {
    const { username, password } = req.body;
    const { tokens, user } = await authService.loginUser(username, password);

    // set cookies
    res.cookie("accessToken", tokens.accessToken, {
      httpOnly: true,
      maxAge: ACCESS_TOKEN_EXPIRATION_TIME_MS,
      sameSite: "lax",
      secure: true,
    });
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      maxAge: REFRESH_TOKEN_EXPIRATION_TIME_MS,
      sameSite: "lax",
      secure: true,
    });

    res.status(200).json({ ...user, accessToken: tokens.accessToken });
  })
);

authRoutes.post(
  "/logout",
  currentUser,
  expressAsyncHandler(async (req: Req, res: Response) => {
    const refreshToken = req.refreshToken!;

    // clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    // blacklist refresh token
    await authService.logoutUser(refreshToken);
    res.status(200).json({ message: "Logged out" });
  })
);

authRoutes.get(
  "/check-access",
  currentUser,
  expressAsyncHandler(async (req: Req, res: Response) => {
    const currentUser = req.currentUser;
    if (!currentUser) {
      throw new NotAuthorizedError("No current user");
    }

    const accessToken = req.accessToken!; // already verified

    res.status(200).json({ ...currentUser, accessToken });
  })
);

export default authRoutes;
