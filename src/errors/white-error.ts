import { CustomError } from "./custom-error";

export class WhiteError extends CustomError {
  statusCode = 200;

  constructor(message?: string) {
    super(
      message ??
        "Sorry, The thing you are trying to do is temporarily unavailable... Wait for some time and try again or ask for support's help"
    );

    Object.setPrototypeOf(this, WhiteError.prototype);
  }
}
