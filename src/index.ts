import { config } from "dotenv";
config();
import { AppModule } from "./module";
import express from "express";
import { readFileSync } from "fs";
import path from "path";

const bootstrap = () => {
  const isProd = process.env.NODE_ENV === "production";
  let key: any, cert: any;

  try {
    key = readFileSync(path.resolve("./certs/key.pem")) as any;
    cert = readFileSync(path.resolve("./certs/cert.pem")) as any;
  } catch (error) {
    // console.log(error);
  }

  if (key && cert && !isProd) {
    new AppModule(express(), { key, cert }).start();
  } else {
    console.log("No key/cert found, starting in development mode");
    new AppModule(express()).start();
  }
};

bootstrap();
