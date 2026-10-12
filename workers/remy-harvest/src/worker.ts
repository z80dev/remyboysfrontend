/**
 * Remy's Harvest leaderboard on basedremyboys.club/api/harvest/*.
 *
 *   GET  /api/harvest/leaderboard        → { top: Entry[] }  (best score per name, top 10)
 *   POST /api/harvest/scores {name, score, caught, level, sisters}
 *        → 200 { rank, best, top } | 400 invalid | 403 origin | 422 name_rejected | 429 slow_down | 503 unavailable
 *   DELETE /api/harvest/scores?name=<name>  (Authorization: Bearer $ADMIN_TOKEN) → { removed }
 *
 * A submission is validated (rules.ts), admitted by the per-IP cooldown, its name screened by Workers AI clef-flash
 * (refused when the model can't answer), then stored. One global SQLite Durable Object holds scores and cooldowns.
 * DELETE is the manual backstop for a name the model lets through.
 */
import { DurableObject } from "cloudflare:workers";
import { type Submission, nameKey, screenName, validateSubmission } from "./rules";

export interface Env {
  BOARD: DurableObjectNamespace<Leaderboard>;
  AI: Ai;
  ENVIRONMENT?: string;
  ADMIN_TOKEN?: string;
}

export interface Entry {
  rank: number;
  name: string;
  score: number;
  caught: number;
  level: number;
}

const TOP = 10;
const COOLDOWN_MS = 15_000;
const DAILY_PER_IP = 60;
const SITE = "https://basedremyboys.club";

export class Leaderboard extends DurableObject<Env> {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL, name TEXT NOT NULL,
        score INTEGER NOT NULL, caught INTEGER NOT NULL, level INTEGER NOT NULL, at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS scores_key ON scores (key, score);
      CREATE TABLE IF NOT EXISTS ips (ip TEXT PRIMARY KEY, last INTEGER NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL);
    `);
  }

  /** Counts an attempt for this (hashed) IP; false while it's cooling down or over today's cap. */
  admit(ip: string): boolean {
    const now = Date.now();
    const day = new Date(now).toISOString().slice(0, 10);
    const row = this.sql.exec<{ last: number; day: string; n: number }>("SELECT last, day, n FROM ips WHERE ip = ?", ip).toArray()[0];
    const n = row && row.day === day ? row.n : 0;
    if (row && (now - row.last < COOLDOWN_MS || n >= DAILY_PER_IP)) return false;
    this.sql.exec("INSERT OR REPLACE INTO ips (ip, last, day, n) VALUES (?, ?, ?, ?)", ip, now, day, n + 1);
    if (Math.random() < 0.01) this.sql.exec("DELETE FROM ips WHERE day <> ?", day);
    return true;
  }

  submit(s: Submission): { rank: number; best: number; top: Entry[] } {
    const key = nameKey(s.name);
    this.sql.exec(
      "INSERT INTO scores (key, name, score, caught, level, at) VALUES (?, ?, ?, ?, ?, ?)",
      key,
      s.name,
      s.score,
      s.caught,
      s.level,
      Date.now(),
    );
    const best = this.sql.exec<{ best: number }>("SELECT MAX(score) AS best FROM scores WHERE key = ?", key).one().best;
    const above = this.sql
      .exec<{ n: number }>("SELECT COUNT(*) AS n FROM (SELECT MAX(score) AS m FROM scores GROUP BY key) WHERE m > ?", best)
      .one().n;
    return { rank: above + 1, best, top: this.top() };
  }

  /** Deletes every score under a name key; returns how many. */
  remove(key: string): number {
    return this.sql.exec("DELETE FROM scores WHERE key = ?", key).rowsWritten;
  }

  /** Best score per name (spelled as on that run), ties to whoever got there first. */
  top(): Entry[] {
    return this.sql
      .exec<{ name: string; score: number; caught: number; level: number }>(
        `SELECT s.name, s.score, s.caught, s.level FROM scores s
         JOIN (SELECT key, MAX(score) AS m FROM scores GROUP BY key) b ON s.key = b.key AND s.score = b.m
         WHERE s.id = (SELECT MIN(id) FROM scores WHERE key = s.key AND score = b.m)
         ORDER BY s.score DESC, s.id ASC LIMIT ?`,
        TOP,
      )
      .toArray()
      .map((r, i) => ({ rank: i + 1, ...r }));
  }
}

function allowedOrigin(origin: string | null, env: Env): boolean {
  if (origin === SITE) return true;
  return env.ENVIRONMENT === "development" && !!origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function reply(body: object, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

async function hashedIp(request: Request): Promise<string> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`remy-harvest:${ip}`));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const board = env.BOARD.get(env.BOARD.idFromName("global"));
    if (url.pathname === "/api/harvest/leaderboard" && request.method === "GET") return reply({ top: await board.top() });
    if (url.pathname !== "/api/harvest/scores") return reply({ error: "not_found" }, 404);
    if (request.method === "DELETE") {
      const auth = request.headers.get("authorization") ?? "";
      if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) return reply({ error: "forbidden" }, 403);
      const name = url.searchParams.get("name");
      if (!name) return reply({ error: "invalid" }, 400);
      return reply({ removed: await board.remove(nameKey(name)) });
    }
    if (request.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
    // The game posts from its own page (also inside the X embed, which is still basedremyboys.club).
    if (!allowedOrigin(request.headers.get("origin"), env)) return reply({ error: "origin" }, 403);
    const text = await request.text();
    if (text.length > 1000) return reply({ error: "invalid" }, 400);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return reply({ error: "invalid" }, 400);
    }
    const sub = validateSubmission(body);
    if (!sub) return reply({ error: "invalid" }, 400);
    if (!(await board.admit(await hashedIp(request)))) return reply({ error: "slow_down" }, 429);
    let verdict: { ok: boolean; p: number; worst: string };
    try {
      verdict = await screenName((input) => env.AI.run("@cf/cloudflare/clef-flash", input), sub.name);
    } catch (err) {
      console.error("clef-flash failed", err);
      return reply({ error: "unavailable" }, 503);
    }
    console.log(JSON.stringify({ name: sub.name, ...verdict }));
    if (!verdict.ok) return reply({ error: "name_rejected" }, 422);
    return reply(await board.submit(sub));
  },
} satisfies ExportedHandler<Env>;
