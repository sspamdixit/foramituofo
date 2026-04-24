import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import preachRouter from "./preach";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(preachRouter);

export default router;
