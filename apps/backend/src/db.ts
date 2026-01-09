import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = path.resolve(process.cwd(), 'data.sqlite');

export type Observation = {
  id: string;
  created_at: string;
  lat: number;
  lng: number;
  timestamp: string;
  features_json: string;
  hash_hex: string;
};

export function initDb() {
  // Ensure file exists; better-sqlite3 will create if missing.
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS observations (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      timestamp TEXT NOT NULL,
      features_json TEXT NOT NULL,
      hash_hex TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS observations_created_at_idx ON observations(created_at);
    CREATE INDEX IF NOT EXISTS observations_hash_idx ON observations(hash_hex);
  `);

  return db;
}
