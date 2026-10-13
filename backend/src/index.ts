import "dotenv/config";
import { createApp } from "./server.js";
const origin = process.env.PUBLIC_ORIGIN ?? "http://127.0.0.1:5173";
if (process.env.NODE_ENV === "production" && !process.env.PUBLIC_ORIGIN)
  throw new Error("PUBLIC_ORIGIN diperlukan dalam produksi.");
const game = createApp({
  origin,
  dbPath: process.env.DATABASE_PATH ?? "data/cariasec.sqlite",
  maxRooms: Number(process.env.MAX_ROOMS ?? 200),
  basePath: process.env.APP_BASE_PATH,
  staticDir: process.env.NODE_ENV === "production" ? "dist/public" : undefined,
});
const port = Number(process.env.PORT ?? 3001);
await game.listen(port, process.env.HOST ?? "127.0.0.1");
console.log(`CARIASEC Colyseus tersedia pada port ${port}`);
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await game.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
