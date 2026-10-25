import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const slug = process.argv[2];
if (!slug || !/^[a-z][a-z0-9_]{1,50}$/.test(slug)) {
  throw new Error("Provide a migration name using lowercase letters, digits, and underscores (for example: add_product_tags).");
}

const directory = path.join(process.cwd(), "src/db/migrations");
const files = await readdir(directory);
const versions = files
  .map((file) => /^(\d{4})_[a-z0-9_]+\.sql$/.exec(file))
  .filter((match): match is RegExpExecArray => match !== null)
  .map((match) => Number(match[1]));
const next = Math.max(0, ...versions) + 1;
if (next > 9999) throw new Error("Migration number exceeds the supported four-digit range.");

const filename = `${String(next).padStart(4, "0")}_${slug}.sql`;
await writeFile(path.join(directory, filename), "-- Add the reviewed PostgreSQL schema changes here.\n", { flag: "wx" });
console.info(`Created ${path.join("src/db/migrations", filename)}`);
