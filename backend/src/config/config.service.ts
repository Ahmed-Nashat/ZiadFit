import { config } from "dotenv";
import fs from "fs";

const envFile: string = `.env.${process.env.NODE_ENV}`;
const envFilePath: string =
  process.env.NODE_ENV && fs.existsSync(envFile) ? envFile : ".env";

config({ path: envFilePath });

export const db_uri: string = process.env.DB_URI!,
  redis_uri: string = process.env.REDIS_URI!,
  app_email: string = process.env.APP_EMAIL!,
  app_password: string = process.env.APP_PASSWORD!;
