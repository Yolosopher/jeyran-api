import { DuplicateError } from "../../errors/duplicate-error";
import { NotAuthorizedError } from "../../errors/not-authorized-error";
import authenticationService, {
  AuthenticationService,
} from "../../services/authentication.service";
import avatarService from "../../services/avatar.service";
import User from "./auth.model";
import { IUser, UserModel } from "./types.dto";

class AuthService {
  constructor(
    private userModel: UserModel,
    protected authenticate: AuthenticationService
  ) {}

  private parseForClient(user: IUser) {
    return {
      id: user.id!,
      username: user.username,
      role: user.role,
    };
  }

  public async registerUser(username: string, password: string) {
    const userExists = await this.userModel.findOne({ username });
    if (userExists) {
      throw new DuplicateError("User already exists");
    }

    const user = await this.userModel.create({ username, password });

    await avatarService.createAvatar(username);

    return this.parseForClient(user);
  }
  public async loginUser(username: string, password: string) {
    const existingUser = await this.userModel.findOne({ username });
    if (!existingUser) {
      throw new NotAuthorizedError("Invalid credentials");
    }

    const passwordMatch = await this.authenticate.comparePassword(
      password,
      existingUser.password
    );
    if (!passwordMatch) {
      throw new NotAuthorizedError("Invalid credentials");
    }
    if (existingUser.deleted) {
      await this.userModel.findByIdAndUpdate(existingUser.id, {
        deleted: false,
      });
    }

    // generate jwt
    const { accessToken, refreshToken } =
      await this.authenticate.generateTokens({
        id: existingUser.id!,
        username: existingUser.username,
        role: existingUser.role,
      });

    return {
      user: this.parseForClient(existingUser),
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }
  public async logoutUser(refreshToken: string) {
    await this.authenticate.blacklistRefreshToken(refreshToken);
    return true;
  }

  public async reCreateAccessToken(refresh_token: string) {
    const result = await this.authenticate.verifyRefreshToken(refresh_token);
    if (!result.success) {
      throw new NotAuthorizedError(result.message);
    }
    const { refreshToken, accessToken, payload } = result;
    return {
      user: this.parseForClient(payload),
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }
}

const authService = new AuthService(User, authenticationService);

export default authService;
