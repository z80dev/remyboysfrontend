// TERMHAIRNATOR art facade — director-owned assembly of the two art modules.
// env.js (environments + passes) and actors.js (rigs, chrome machine, props,
// type) are built to CONTRACTS.md; this file only composes them. Do not add
// drawing logic here.
import * as ENV from './env.js'
import * as ACT from './actors.js'

export const loadEnv = ENV.loadEnv
export const loadActors = ACT.loadActors

export async function loadArt() {
  const [env, actors] = await Promise.all([ENV.loadEnv(), ACT.loadActors()])
  return { ...env, ...actors }
}
