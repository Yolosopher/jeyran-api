import { CustomError } from "./custom-error";

export class NotFoundError extends CustomError {
  statusCode = 404;

  constructor(message?: string) {
    super(message ?? "not found!");

    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
