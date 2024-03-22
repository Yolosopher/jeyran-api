import { ValidationError } from "express-validator";
import { CustomError } from "./custom-error";

export class RequestValidationError extends CustomError {
  statusCode = 400;

  constructor(public error: ValidationError) {
    super("Invalid request");

    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }
}
