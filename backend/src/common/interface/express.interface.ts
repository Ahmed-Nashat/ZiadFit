import type { HUser } from "../../database/index.js";
import type { ICachedUser } from "./index.js";

declare module "express-serve-static-core" {
  interface Request {
    validate: any;
    user?: HUser | ICachedUser;
  }
}
