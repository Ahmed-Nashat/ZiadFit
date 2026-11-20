import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import { dbConnection } from "./src/database/index.js";
// convert any function into async function

const app = express();
app.use(express.json(), cors());

await dbConnection();

app.get("/", (req: Request, res: Response, next: NextFunction): Response => {
  return res.status(200).json({
    msg: "Server is health",
  });
});

// app.use("/auth", routers.authRouter);
// app.use("/user", routers.userRoter);

// app.use(errorHandler);
app.listen(3000, () => {
  console.log(`Server running on port 3000`);
});
