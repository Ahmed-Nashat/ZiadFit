import { config } from "dotenv";
import fs from "fs";

const envFile: string = `.env.${process.env.NODE_ENV}`;
const envFilePath: string =
  process.env.NODE_ENV && fs.existsSync(envFile) ? envFile : ".env";

config({ path: envFilePath });

export const db_uri: string = process.env.DB_URI!,
  redis_uri: string = process.env.REDIS_URI!,
  app_email: string = process.env.APP_EMAIL!,
  app_password: string = process.env.APP_PASSWORD!,
  hash_salt: number = Number(process.env.HASH_SALT)!,
  enc_algo: string = process.env.ENC_ALGO!,
  key: string = process.env.KEY!,
  iv_length: number = Number(process.env.IV_LENGTH),
  admin_refresh_secret_key: string = process.env.ADMIN_REFRESH_SECRET_KEY!,
  admin_access_secret_key: string = process.env.ADMIN_ACCESS_SECRET_KEY!,
  user_refresh_secret_key: string = process.env.USER_REFRESH_SECRET_KEY!,
  user_access_secret_key: string = process.env.USER_ACCESS_SECRET_KEY!,
  refresh_ex: number = Number(process.env.REFRESH_EX),
  access_ex: number = Number(process.env.ACCESS_EX),
  max_send_retries: number = Number(process.env.MAX_SEND_RETRIES!),
  max_retries: number = Number(process.env.MAX_RETRIES)!;
