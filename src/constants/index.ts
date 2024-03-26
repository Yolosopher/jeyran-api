export const parseTimeSpanToMilliseconds = (timeSpan: string): number => {
  const matches = timeSpan.match(/^(\d+)([smhd])$/);
  if (!matches) {
    throw new Error("Invalid time span format");
  }

  const value = parseInt(matches[1]);
  const unit = matches[2];

  let multiplier: number;
  switch (unit) {
    case "s":
      multiplier = 1000; // seconds to milliseconds
      break;
    case "m":
      multiplier = 1000 * 60; // minutes to milliseconds
      break;
    case "h":
      multiplier = 1000 * 60 * 60; // hours to milliseconds
      break;
    case "d":
      multiplier = 1000 * 60 * 60 * 24; // days to milliseconds
      break;
    default:
      throw new Error("Invalid time unit");
  }

  return value * multiplier;
};

export const TIME_TO_START_NEW_ROUND_IN_MS = 3000;

export const ACCESS_TOKEN_EXPIRATION_TIME = "1d"; // "1d" || "15m";
export const REFRESH_TOKEN_EXPIRATION_TIME = "7d";

export const ACCESS_TOKEN_EXPIRATION_TIME_MS = parseTimeSpanToMilliseconds(
  ACCESS_TOKEN_EXPIRATION_TIME
);
export const REFRESH_TOKEN_EXPIRATION_TIME_MS = parseTimeSpanToMilliseconds(
  REFRESH_TOKEN_EXPIRATION_TIME
);

export const CORS_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:6060",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5173",
  "https://localhost:5173",
  "http://127.0.0.1:5173",
  "https://127.0.0.1:5173",
  "https://yolosopher.online",
  "https://api.yolosopher.online",
];
