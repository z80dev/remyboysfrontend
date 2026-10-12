/**
 * Remy's Harvest leaderboard rules: what a submission must look like, what a score can possibly be, and the
 * clef-flash name screen. Pure (the AI is passed in), so `bun test` covers it without the Workers runtime.
 */

export const NAME_MIN = 2;
export const NAME_MAX = 16;
/** Catches per level, best points per catch (rainbow corn 150 × combo 5 × Golden Hour 2) and the Three Sisters bonus
 * per level. Must match src/harvest/game.ts. */
export const PER_LEVEL = 25;
export const MAX_PER_CATCH = 150 * 5 * 2;
export const SISTERS_BONUS = 300;
/** clef-flash "offensive" probability at or above which a name is refused. */
export const OFFENSIVE_AT = 0.3;

export interface Submission {
  name: string;
  score: number;
  caught: number;
  level: number;
  sisters: number;
}

const count = (v: unknown, max: number): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= max;

/** NFKC, trimmed, inner whitespace collapsed; null if it isn't a 2–16 character name of letters, digits, spaces and
 * _ . ' - with at least one letter or digit. */
export function normalizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.normalize("NFKC").trim().replace(/\s+/g, " ");
  const length = [...name].length;
  if (length < NAME_MIN || length > NAME_MAX) return null;
  if (!/^[\p{L}\p{N} _.'-]+$/u.test(name) || !/[\p{L}\p{N}]/u.test(name)) return null;
  return name;
}

/** The leaderboard groups by this: case- and spacing-insensitive. */
export function nameKey(name: string): string {
  return name.toLowerCase().replace(/[\s_.'-]+/g, "");
}

/** A well-formed, possible game result, or null. Scores are client-reported, so this only rejects the impossible:
 * the level must follow from the catches and the score can't beat every catch at the maximum. */
export function validateSubmission(body: unknown): Submission | null {
  if (!body || typeof body !== "object") return null;
  const { name: rawName, score, caught, level, sisters } = body as Record<string, unknown>;
  const name = normalizeName(rawName);
  if (!name || !count(score, 1e9) || !count(caught, 100_000) || !count(level, 10_000) || !count(sisters, 50_000))
    return null;
  if (score < 1 || caught < 1) return null;
  if (level !== 1 + Math.floor(caught / PER_LEVEL)) return null;
  if (sisters * 3 > caught) return null;
  if (score > caught * MAX_PER_CATCH + sisters * SISTERS_BONUS * level) return null;
  return { name, score, caught, level, sisters };
}

/** The Workers AI binding's run() for clef-flash (untyped in workers-types, so the answer is narrowed at runtime). */
export type RunClef = (input: Record<string, unknown>) => Promise<unknown>;

const DISGUISE = "even if misspelled, spaced out, abbreviated, reversed, in another language or written in leetspeak";
/** One yes/no question per kind of harm: a single "is it offensive?" question couldn't separate gamer tags (Sniper,
 * Assassin99) from slurs when measured on 2026-10-12; separate questions can. */
export const QUESTIONS: Record<string, string> = {
  slur:
    "Does the name contain or allude to a slur or derogatory term for a race, ethnicity, nationality, religion, " +
    "disability, gender or sexuality, including slurs for Indigenous or Native American peoples (such as redskin, " +
    `injun, squaw), ${DISGUISE}? Real people's names and ordinary words are not slurs.`,
  hate: `Does the name reference a hate group, Nazism, extremist slogans or codes (like 88 or 1488), ${DISGUISE}?`,
  sexual: `Does the name contain sexual words, body parts or sexual innuendo, ${DISGUISE}?`,
  profanity: `Does the name contain a swear word or profanity, ${DISGUISE}?`,
  harm:
    "Does the name threaten or harass a real person or group, encourage self-harm or suicide (like kys), or promote " +
    "hard drugs? Ordinary video-game words such as sniper, assassin, killer, slayer or warrior do not count.",
};

/** answers[id].noul from a clef-flash response, if present. */
function noul(res: unknown, id: string): number | undefined {
  if (!res || typeof res !== "object" || !("answers" in res)) return undefined;
  const answers = res.answers;
  if (!answers || typeof answers !== "object" || !(id in answers)) return undefined;
  const a: unknown = answers[id as keyof typeof answers];
  if (!a || typeof a !== "object" || !("noul" in a) || typeof a.noul !== "number" || !Number.isFinite(a.noul)) return undefined;
  return a.noul;
}

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g", "@": "a", $: "s" };

/** The name lower-cased with spacing/punctuation removed and leetspeak digits read as letters (sh1t h3ad →
 * shithead), shown to the model next to the original so disguised words surface. */
export function decodeName(name: string): string {
  return [...name.toLowerCase()].map((c) => LEET[c] ?? c).join("").replace(/[\s_.'-]+/g, "");
}

const CONTEXT = "Player name typed into the public high-score leaderboard of a family-friendly web game.";

/** Asks clef-flash whether the name is fit for a public, all-ages leaderboard, twice in parallel: the name as typed,
 * and its decoded spelling (single readings were noisy on disguised words). Refused when any category's probability
 * in either reading reaches OFFENSIVE_AT. Throws if the model doesn't answer (after one retry each), so the caller
 * refuses rather than publish an unscreened name. */
export async function screenName(run: RunClef, name: string): Promise<{ ok: boolean; p: number; worst: string }> {
  const questions = Object.fromEntries(Object.entries(QUESTIONS).map(([id, instructions]) => [id, { type: "noul", instructions }]));
  const ask = async (state: Record<string, string>) => {
    const input = { model: "clef-flash", state: { context: CONTEXT, ...state }, questions };
    return run(input).catch(() => run(input));
  };
  const answers = await Promise.all([ask({ name }), ask({ name, letters_only: decodeName(name) })]);
  let worst = "";
  let p = -1;
  for (const res of answers)
    for (const id of Object.keys(QUESTIONS)) {
      const q = noul(res, id);
      if (q === undefined) throw new Error(`clef-flash returned no ${id} answer`);
      if (q > p) {
        p = q;
        worst = id;
      }
    }
  return { ok: p < OFFENSIVE_AT, p, worst };
}
