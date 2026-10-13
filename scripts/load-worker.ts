import { createApp } from "../backend/src/server.js";
const app = createApp({
  dbPath: process.env.LOAD_DB ?? ":memory:",
  maxRooms: 200,
});
await app.listen(0, "127.0.0.1");
process.send?.({
  type: "ready",
  port: (app.http.address() as { port: number }).port,
});
let cpu = process.cpuUsage(),
  time = performance.now();
const timer = setInterval(() => {
  const next = process.cpuUsage(),
    now = performance.now();
  process.send?.({
    type: "metric",
    rssMB: process.memoryUsage().rss / 1024 / 1024,
    cpuPercent:
      ((next.user - cpu.user + next.system - cpu.system) /
        ((now - time) * 1000)) *
      100,
  });
  cpu = next;
  time = now;
}, 500);
process.on("message", async (message) => {
  if (message === "stop") {
    clearInterval(timer);
    await app.close();
    process.exit(0);
  }
});
