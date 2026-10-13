import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Room } from "../../../shared/game.js";
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db
      .exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY, snapshot TEXT NOT NULL, updated_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS results(code TEXT PRIMARY KEY, result TEXT NOT NULL, finished_at INTEGER NOT NULL);
 INSERT OR IGNORE INTO migrations VALUES(1,datetime('now'));`);
  }
  save(r: Room) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare(
          "INSERT INTO rooms VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET snapshot=excluded.snapshot,updated_at=excluded.updated_at",
        )
        .run(r.code, JSON.stringify(r), r.updatedAt);
      if (r.phase === "finished")
        this.db
          .prepare("INSERT OR REPLACE INTO results VALUES(?,?,?)")
          .run(
            `${r.code}:${r.createdAt}`,
            JSON.stringify({
              winners: r.winners,
              reason: r.reason,
              actions: r.actions,
              players: r.players.map((p) => ({
                name: p.name,
                families: p.families,
                cards: p.hand.length,
              })),
            }),
            r.updatedAt,
          );
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  load(): Room[] {
    return this.db
      .prepare("SELECT snapshot FROM rooms")
      .all()
      .map((row) => JSON.parse(row.snapshot as string));
  }
  delete(code: string) {
    this.db.prepare("DELETE FROM rooms WHERE code=?").run(code);
  }
  prune(now: number) {
    this.db
      .prepare("DELETE FROM results WHERE finished_at<?")
      .run(now - 30 * 86400_000);
  }
  close() {
    this.db.close();
  }
}
