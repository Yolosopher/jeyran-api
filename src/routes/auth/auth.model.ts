import { Schema, model } from "mongoose";
import { Role } from "../../global_types.dto";

import { IUser, UserModel } from "./types.dto";
import authenticationService from "../../services/authentication.service";

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: Number,
      enum: Role,
      default: 0,
      required: true,
    },
    deleted: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: true,
    },
    versionKey: false,
    toJSON: {
      transform(doc, ret) {
        ret.id = doc._id;
        delete ret._id;
      },
    },
  }
);

UserSchema.virtual("id").get(function () {
  return this._id.toString();
});

UserSchema.pre("save", async function (done) {
  if (this.isModified("password") || this.isNew) {
    const hashed = authenticationService.hashPassword(this.get("password"));
    this.set("password", hashed);
  }
  done();
});

const User = model<IUser, UserModel>("User", UserSchema);

export default User;
