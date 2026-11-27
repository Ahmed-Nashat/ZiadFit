import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import { dbConnection } from "./scripts/src/database/index.js";
import * as routers from "./scripts/src/modules/index.js";
import { errorHandler } from "./scripts/src/common/index.js";
import { cacheService } from "./scripts/src/common/services/cache.service.js";

const app = express();
app.use(express.json(), cors());

await dbConnection();
await cacheService.connect();

app.get("/", (req: Request, res: Response, next: NextFunction): Response => {
  return res.status(200).json({
    msg: "Server is health",
  });
});

app.use("/auth", routers.authRouter);
app.use("/user", routers.userRouter);
app.use("/subscription", routers.subscriptionRouter);
app.use("/questionnaire", routers.questionnaireRouter);
app.use("/exercises", routers.exerciseRouter);
app.use("/training-plans", routers.trainingPlanRouter);

app.use(errorHandler);
app.listen(3000, () => {
  console.log(`Server running on port 3000`);
});
