import { Request, Response, NextFunction } from "express";

export interface IPerson {
  first_name: string;
  last_name: string;
  tel: string;
  personal_id?: number;
  email?: string;
  age?: number;
  address?: string;
}
export enum Role {
  "USER" = 0,
  "ADMIN" = 1,
  "SUPER_ADMIN" = 2,
}
export interface IPersonDocument extends IPerson, Document {}

import { Schema } from "mongoose";
import z from "zod";
import { IncomingMessage, Server, ServerResponse } from "http";
import { Server as SocketIoServer, Socket } from "socket.io";

export type tID = string | Schema.Types.ObjectId;

export const zodNumericString = z.string().refine(
  (v) => {
    let n = Number(v);
    return !isNaN(n) && v?.length > 0;
  },
  { message: "Invalid number" }
);
declare global {
  var io: null;
  interface JWT_PAYLOAD {
    id: string;
    username: string;
    role: Role;
  }
  type tID = string | Schema.Types.ObjectId;

  type Message_T = {
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
  };

  interface I_Pagination {
    limit: number;
    page: number;
    search: string;
    sort: string;
    deleted: boolean;
  }
  interface I_Pagination_For_Comments extends I_Pagination {
    postId: tID;
  }
  namespace Express {
    interface Request {
      clientIp?: string | string[];
      currentUser?: JWT_PAYLOAD;
      uploaderError?: Error;
      session?: {
        cartId?: tID;
        jwt?: string;
      };
    }
  }
  interface Req extends Request {
    currentUser?: JWT_PAYLOAD;
    pagination?: I_Pagination;
    accessToken?: string;
    refreshToken?: string;
  }
  interface Sock extends Socket {
    currentUser?: JWT_PAYLOAD;
  }
  interface SockVerified extends Socket {
    currentUser: JWT_PAYLOAD;
  }
  type T_HTTP_SERVER = Server<typeof IncomingMessage, typeof ServerResponse>;
}
