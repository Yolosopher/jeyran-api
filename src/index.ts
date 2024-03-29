import { config } from "dotenv";
config();
import { AppModule } from "./module";
import express from "express";
import { readFileSync } from "fs";
import path from "path";

const bootstrap = () => {
  const isProd = process.env.NODE_ENV === "production";
  const key = readFileSync(path.resolve("./certs/key.pem")) as any;
  const cert = readFileSync(path.resolve("./certs/cert.pem")) as any;

  if (key && cert && !isProd) {
    const app = new AppModule(express(), { key, cert });
    app.start();
  } else {
    const app = new AppModule(express(), undefined);
    app.start();
  }
};

bootstrap();
