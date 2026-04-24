import path from "node:path";
import { existsSync } from "node:fs";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const serveStaticFrom = process.env.SERVE_STATIC_DIR;
const defaultStaticDir = path.resolve(
  __dirname,
  "..",
  "..",
  "buddha-chat",
  "dist",
  "public",
);
const staticDir = serveStaticFrom
  ? path.resolve(serveStaticFrom)
  : defaultStaticDir;

if (existsSync(staticDir)) {
  logger.info({ staticDir }, "Serving static frontend");
  app.use(express.static(staticDir, { index: false }));

  app.get(/^(?!\/api\/).*/, (_req, res, next) => {
    const indexPath = path.join(staticDir, "index.html");
    if (!existsSync(indexPath)) {
      next();
      return;
    }
    res.sendFile(indexPath);
  });
}

export default app;
