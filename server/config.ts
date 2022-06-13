import "dotenv/config";

export const expectEnv = (key: string) => {
  const val = process.env[key];

  if (!val)
    throw new Error(`Expected ${key} environment variable to be defined`);
  return val;
};

export const EXERCISM_TOKEN = expectEnv("EXERCISM_TOKEN");
export const SLACK_BOT_TOKEN = expectEnv("SLACK_BOT_TOKEN");
export const MONGO_URI = expectEnv("MONGO_URI");
export const REQUEST = expectEnv("REQ_COLLECTION_NAME");
export const DB_NAME = expectEnv("DB_NAME");
