import { CustomError } from "./custom-error";

export class NotAuthorizedError extends CustomError {
  statusCode = 401;
  refresh_required = false;

  constructor(message?: string, refresh_required?: boolean) {
    super(message ?? "Not authorized");

    if (refresh_required) {
      this.refresh_required = refresh_required;
    }

    Object.setPrototypeOf(this, NotAuthorizedError.prototype);
  }
}
