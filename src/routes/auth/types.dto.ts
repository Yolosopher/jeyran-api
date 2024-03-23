import { Document, Model } from "mongoose";
import { Role } from "../../global_types.dto";

export interface IUser extends Document {
  _id?: tID;
  id?: tID;
  username: string;
  password: string;
  role: Role;

  deleted: boolean;
}

export interface UserModel extends Model<IUser> {}

export interface UserCreateDTO {
  username: string;
  password: string;
  role?: Role;
}

export interface UserUpdatePasswordDTO {
  newPassword: string;
  targetId: string;
  selfId: string;
}
export interface UserDeleteDTO {
  targetId: string;
  selfId: string;
}

export interface LoginDTO {
  username: string;
  password: string;
}

export type UserPopulatedType = {
  id: string;
  username: string;
};
