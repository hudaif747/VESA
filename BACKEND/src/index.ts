import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { connectArango } from "./database";
import { bootstrapGateway } from "./gateway";

// IMPORT ROUTES
import mainRouter from "./routes/getDataById";
import wordRouter from "./routes/getKeywords";
import timeRouter from "./routes/getDataIdbyTime";
import abstractRouter from "./routes/getAbstractbyId";
import authorRouter from "./routes/getAuthorById";
import mapRouter from "./routes/getMapData";
import persistantRouter from "./routes/persist";
import healthCheckRouter from "./routes/healthCheck";
import locationNameRouter from "./routes/getLocationName";
import initemptydbRouter from "./routes/initemptydb";
import pangaeaHarvesterRouter from "./routes/pangaeaHarvester";

// Load environment variables before reading config values
dotenv.config();

const app = express();

const parsePort = (value: string | undefined, fallback = 3000): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const expressPort = parsePort(process.env.NODE_PORT);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    credentials: true,
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  })
);

// Route registry
const ROUTES = [
  ["/main", mainRouter],
  ["/keywords", wordRouter],
  ["/time", timeRouter],
  ["/abstract", abstractRouter],
  ["/author", authorRouter],
  ["/map", mapRouter],
  ["/locname", locationNameRouter],
  ["/persist", persistantRouter],
  ["/health", healthCheckRouter],
  ["/initemptydb", initemptydbRouter],
  ["/pangaea-harvester", pangaeaHarvesterRouter],
] as const;

ROUTES.forEach(([path, router]) => app.use(path, router));

async function startServer() {
  try {
    bootstrapGateway();
    await connectArango();
    app.listen(expressPort, () => {
      console.log(`Server started on port ${expressPort}`);
    });
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
}

void startServer();
