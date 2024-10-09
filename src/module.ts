import { Application, json, urlencoded } from "express";

import cookieParser from "cookie-parser";
import cors from "cors";
import routes from "./routes";
import { connect } from "mongoose";
import { errorHandler, invalidRouteHandler } from "./middleware";
import redis from "./redis";
import { createServer } from "http";
import { createServer as createServerS } from "https";
import socketioServer from "./socketio";
import { CORS_ORIGINS } from "./constants";
import sessionService from "./services/session.service";
export class AppModule {
  public hostname: string;
  public domain: string;
  public isProd: boolean;
  public port: number;
  public httpServer: T_HTTP_SERVER | null;
  constructor(
    public app: Application,
    public certOption?: { key: string; cert: string } | null
  ) {
    if (!this.certOption) {
      this.certOption = null;
    }
    this.httpServer = null;
    this.port = process.env.PORT ? Number(process.env.PORT) : 7171;
    this.domain = "https://jeyran-api.yolosopher.site";
    this.hostname = `https://localhost:${this.port}`;

    this.isProd = false;
    this.app.set("trust proxy", true);
    this.app.use(
      cors({
        origin: CORS_ORIGINS,
        optionsSuccessStatus: 200,
        credentials: true,
      })
    );
    this.app.use(cookieParser());

    this.app.use(urlencoded({ extended: false }));
    this.app.use(json());
  }

  async start() {
    if (process.env.NODE_ENV === "production") {
      this.isProd = true;
      this.hostname = this.domain;
    }
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI must be defined");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET must be defined");
    }

    this.app.locals.NODE_ENV = process.env.NODE_ENV ?? "development";
    this.app.locals.HOSTNAME = this.hostname;

    this.app.use(routes);

    this.app.all("*", invalidRouteHandler);
    this.app.use(errorHandler);

    try {
      console.log("MODE: ", process.env.NODE_ENV ?? "development");

      const url = `${process.env.MONGO_URI}?retryWrites=true`;

      console.log("Database connection");
      console.log(url);
      await connect(url, {
        dbName: "rock-paper-scissors" + (this.isProd ? "-prod" : "-dev"),
      });
    } catch (error) {
      throw new Error("Database connection failed");
    }

    try {
      // redis client
      console.log("Redis connection");
      redis.on("error", (err) => console.log("Redis Client Error", err));
      await redis.connect();

      // log every redis-cached sessions out when restarting/starting server
      await sessionService.logEveryoneOut();
    } catch (error) {
      console.log(error);
    }

    if (!this.certOption) {
      this.httpServer = createServer(this.app);
    } else {
      this.httpServer = createServerS(this.certOption, this.app);
    }
    this.httpServer.listen(this.port, () => {
      socketioServer.listen(this.httpServer!, {
        cors: {
          origin: CORS_ORIGINS,
          credentials: true,
        },
      });

      console.log(
        `Listening on port http${this.certOption ? "s" : ""}://localhost:${
          this.port
        }`
      );
    });
  }
}
