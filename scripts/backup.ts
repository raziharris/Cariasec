import "dotenv/config";
import { backup, DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
const source = resolve(process.env.DATABASE_PATH ?? "data/cariasec.sqlite");
const destination = resolve(
  process.argv[2] ??
    `data/backups/cariasec-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
);
if (!existsSync(source) || source === destination || existsSync(destination))
  throw new Error(
    "Sumber mesti wujud; destinasi mestilah fail baharu yang berbeza.",
  );
mkdirSync(dirname(destination), { recursive: true });
const db = new DatabaseSync(source, { readOnly: true });
try {
  await backup(db, destination);
  const check = new DatabaseSync(destination, { readOnly: true });
  try {
    const result = check.prepare("PRAGMA integrity_check").get();
    if (result?.integrity_check !== "ok")
      throw new Error("Backup integrity failed");
  } finally {
    check.close();
  }
  console.log(`Sandaran disahkan: ${destination}`);
} finally {
  db.close();
}
