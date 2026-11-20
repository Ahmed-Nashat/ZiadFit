import mongoose from "mongoose";
import { db_uri } from "../config/config.service.js";
import dns from "node:dns";

export default async () => {
  if (!db_uri) throw new Error("DB_URI is missing");
  await mongoose.connect(db_uri);
  console.info(`DB connected: ${mongoose.connection.name}`);
};

dns.setServers(["1.1.1.1", "8.8.8.8"]);
