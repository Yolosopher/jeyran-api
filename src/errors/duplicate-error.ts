import { CustomError } from "./custom-error";

export class DuplicateError extends CustomError {
  statusCode = 409;
  constructor(message?: string) {
    super(message ?? "Duplicate!");
    Object.setPrototypeOf(this, DuplicateError.prototype);
  }
}
