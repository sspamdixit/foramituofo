import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import preachRouter from "./preach";
import decodeRouter from "./decode";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(preachRouter);
router.use(decodeRouter);

export default router;
