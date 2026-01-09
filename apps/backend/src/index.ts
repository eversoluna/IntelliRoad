import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import crypto from 'node:crypto';
import { initDb } from './db.ts';

const PORT = Number(process.env.PORT || 4000);
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const db = initDb();

const FeatureSchema = z.object({
  type: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional()
});

const ObservationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timestamp: z.string(),
  features: z.array(FeatureSchema).default([]),
  hashHex: z.string().regex(/^0x[0-9a-fA-F]{64}$/)
});

function sha256Hex(input: string) {
  return '0x' + crypto.createHash('sha256').update(input).digest('hex');
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, name: 'IntelliRoad backend', time: new Date().toISOString() });
});

app.post('/api/observations', (req, res) => {
  const parsed = ObservationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  // Server-side verify hash to prevent trivial tampering
  const { lat, lng, timestamp, features, hashHex } = parsed.data;
  const canonical = JSON.stringify({ lat, lng, timestamp, features });
  const expected = sha256Hex(canonical);
  if (expected.toLowerCase() !== hashHex.toLowerCase()) {
    return res.status(400).json({ ok: false, error: 'Hash mismatch (server recomputed a different value).' });
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(
    `INSERT INTO observations (id, created_at, lat, lng, timestamp, features_json, hash_hex)
     VALUES (@id, @created_at, @lat, @lng, @timestamp, @features_json, @hash_hex)`
  );

  stmt.run({
    id,
    created_at: createdAt,
    lat,
    lng,
    timestamp,
    features_json: JSON.stringify(features),
    hash_hex: hashHex
  });

  res.json({ ok: true, id, createdAt, hashHex });
});

app.get('/api/observations', (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const rows = db
    .prepare(
      `SELECT id, created_at, lat, lng, timestamp, features_json, hash_hex
       FROM observations
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(limit);

  const out = rows.map((r: any) => ({
    id: r.id,
    createdAt: r.created_at,
    lat: r.lat,
    lng: r.lng,
    timestamp: r.timestamp,
    features: JSON.parse(r.features_json),
    hashHex: r.hash_hex
  }));

  res.json({ ok: true, observations: out });
});

app.listen(PORT, () => {
  console.log(`[IntelliRoad] Backend listening on http://localhost:${PORT}`);
});
