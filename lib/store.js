// Where the edited text lives.
//   On Vercel: an Upstash Redis database (added from the project's Storage tab).
//   Locally:   data/config.json, unless Redis env vars are set.
const fs = require('fs');
const path = require('path');
const DEFAULTS = require('../defaults.json');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const KEY = 'birthday:config';

// Vercel's Upstash integration names these KV_REST_API_*; a direct Upstash setup uses UPSTASH_REDIS_REST_*.
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(REDIS_URL && REDIS_TOKEN);

class NoDatabaseError extends Error {}

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis error ${res.status}`);
  return (await res.json()).result;
}

// Saved values win, but any key missing from the saved copy falls back to the default,
// so adding new fields to defaults.json never breaks an older saved config.
function deepMerge(base, over) {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) {
    return over === undefined ? base : over;
  }
  const out = { ...base };
  for (const key of Object.keys(over || {})) {
    out[key] = key in base ? deepMerge(base[key], over[key]) : over[key];
  }
  return out;
}

async function readSaved() {
  if (useRedis) {
    const raw = await redis(['GET', KEY]);
    return raw ? JSON.parse(raw) : {};
  }
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { return {}; }
}

// Vercel's disk is read-only, so saving there needs the database.
function requireWritable() {
  if (!useRedis && process.env.VERCEL) throw new NoDatabaseError('No database connected');
}

async function getConfig() {
  return deepMerge(DEFAULTS, await readSaved());
}

async function saveConfig(config) {
  requireWritable();
  if (useRedis) await redis(['SET', KEY, JSON.stringify(config)]);
  else {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }
  return getConfig();
}

async function resetConfig() {
  requireWritable();
  if (useRedis) await redis(['DEL', KEY]);
  else fs.rmSync(CONFIG_FILE, { force: true });
  return getConfig();
}

module.exports = { getConfig, saveConfig, resetConfig, NoDatabaseError, DEFAULTS };
