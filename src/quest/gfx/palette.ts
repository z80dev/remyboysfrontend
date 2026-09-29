import type { Theme } from '../types'
import { type Col, hex } from './px'

/** Per-theme GBA-style ramps. Ramps are ordered dark → light. */
export interface Pal {
  /** Field ('.') ground: [deep, dark, base, light, highlight]. */
  field: Col[]
  /** Field detail tufts / specks. */
  tuft: Col[]
  /** Tall grass ('"'): [outline, dark, base, light, tip]. Base under it = `tallBase`. */
  tall: Col[]
  tallBase: Col[]
  dirt: Col[] // ':'  [rim, dark, base, light, hi]
  sand: Col[] // 's'
  paved: Col[] // '='  [grout, dark, base, light, hi]
  rock: Col[] // 'd'
  water: Col[] // [edge, deep, base, light, foam]
  cliff: Col[] // face [outline, dark, base, light, hi]
  cliffTop: Col[] // plateau top [dark, base, light, hi]
  tree: Col[] // broadleaf canopy [outline, dark, base, light, hi]
  pine: Col[] // conifer canopy (canyon: weathered deadwood)
  blossom: Col[] // blossom canopy (pink / white)
  trunk: Col[] // [outline, dark, base, light]
  bush: Col[]
  fence: Col[] // [outline, dark, base, light]
  flowers: Col[]
  ledge: Col[] // [outline, face-dark, face, lip-light]
  /** Mesa strata bands, light → dark (cliff faces, terraces, rock spires). */
  strata: Col[]
  /** Cactus / desert scrub [outline, dark, base, light, hi]. */
  cactus: Col[]
  /** Lily pads / reeds [outline, dark, base, light]. */
  pad: Col[]
}

const H = (...s: string[]) => s.map((c) => hex(c))

const TOWN: Pal = {
  field: H('#3f8a45', '#5aac52', '#78c65e', '#9bdc76', '#c3ef98'),
  tuft: H('#4e9e4c', '#63b457', '#a9e284'),
  tall: H('#1d4d2c', '#2e7a3c', '#43a04b', '#6cc55a', '#a6e67c'),
  tallBase: H('#2f733c', '#3c8a44'),
  dirt: H('#a07642', '#c19660', '#d9b77c', '#e8cf9a', '#f6e6be'),
  sand: H('#c6a468', '#dcc088', '#ecd8a2', '#f6e8c0', '#fff8e0'),
  paved: H('#98928a', '#b4aea4', '#cec8bc', '#e0dace', '#f4f0e6'),
  rock: H('#8a6a52', '#a5836a', '#bb9a7e', '#cfb294', '#e2caae'),
  water: H('#1e4fb0', '#2d6ee0', '#3f8ff4', '#79bdff', '#e6f6ff'),
  cliff: H('#3b2c28', '#6e5646', '#8e735c', '#ad9276', '#cbb194'),
  cliffTop: H('#5a9a48', '#86c865', '#a6dc7e', '#c8f09c'),
  tree: H('#173d24', '#23663a', '#34894a', '#52ad5a', '#86d472'),
  pine: H('#0f2c28', '#17493c', '#1f624a', '#2f8058', '#5aa874'),
  blossom: H('#5e2a48', '#b8557c', '#e083a4', '#f6b2c8', '#fde2ea'),
  trunk: H('#3a2618', '#5e3f26', '#7d5634', '#9c7048'),
  bush: H('#1b4a2a', '#2c7a3e', '#40a04e', '#6ac662', '#9ee082'),
  fence: H('#4a2e1c', '#8a5a34', '#b07a48', '#d6a06a'),
  flowers: H('#f25a6a', '#ffffff', '#ffd84a', '#ff9ad2'),
  ledge: H('#2a2418', '#6e5a3a', '#8e7850', '#d6f5a8'),
  strata: H('#f4dcb0', '#dcb888', '#bf9468', '#a07452', '#7c563e', '#5a3c2c', '#3b2820'),
  cactus: H('#173a24', '#2a6038', '#3f8a4a', '#62ae5c', '#9cd680'),
  pad: H('#16402a', '#2a6e3a', '#3f9446', '#6cbc5c'),
}

const MEADOW: Pal = {
  ...TOWN,
  field: H('#4a9a4c', '#66ba58', '#86d464', '#abe67e', '#d2f6a4'),
  tuft: H('#5aac52', '#72c25c', '#bdee92'),
  tall: H('#1e5530', '#2f8340', '#48aa50', '#74cf5e', '#b2ee86'),
  tallBase: H('#347c40', '#42944a'),
  tree: H('#18432a', '#26703e', '#3a9650', '#5cba60', '#96de7c'),
  pine: H('#10302a', '#194f3e', '#236a4c', '#33885a', '#62b078'),
  blossom: H('#5a2c52', '#b0608e', '#da90b6', '#f2c0d6', '#fff0f4'),
  bush: H('#1c4e2c', '#2f8242', '#46a854', '#72cc66', '#a8e88a'),
  flowers: H('#ff6a8a', '#ffffff', '#ffe066', '#c890ff', '#7ac8ff', '#ff9a4a'),
  cliffTop: H('#66ac54', '#86d464', '#abe67e', '#d2f6a4'),
  ledge: H('#2c2618', '#74603e', '#957e54', '#e0fab4'),
}

const CITY: Pal = {
  ...TOWN,
  field: H('#44883f', '#5ea64f', '#7abe5a', '#9ad272', '#bfe690'),
  tuft: H('#52984a', '#66ac56', '#a6d880'),
  paved: H('#a8876a', '#c4a484', '#d8bc9a', '#e8d2b2', '#f6e8d0'),
  dirt: H('#9a6e42', '#b88c5c', '#d0ac78', '#e2c696', '#f2e0bc'),
  tree: H('#163a22', '#225f36', '#328046', '#4ea456', '#80cc6c'),
  pine: H('#0e2a26', '#164638', '#1e5c46', '#2c7852', '#529e6c'),
  fence: H('#1e2230', '#3a4050', '#555c70', '#7c849a'),
  flowers: H('#ff5a5a', '#ffffff', '#ffc83a', '#ff8ac0'),
}

const CANYON: Pal = {
  field: H('#a55a34', '#c0703e', '#d4864c', '#e39c5e', '#f0b678'),
  tuft: H('#8a7a34', '#b09a44', '#e0c468'),
  tall: H('#5a3a14', '#9a6a24', '#c89838', '#e8bc54', '#fae08a'),
  tallBase: H('#a5602f', '#b8703a'),
  dirt: H('#b0683c', '#cc8450', '#e0a068', '#ecb880', '#f6d0a0'),
  sand: H('#c8905a', '#dcaa70', '#ecc28a', '#f6d6a6', '#fff0cc'),
  paved: H('#8e6a52', '#a8846a', '#bf9c80', '#d4b496', '#e8ccb0'),
  rock: H('#7a3c26', '#9c4e30', '#b8603a', '#cc7648', '#e0925e'),
  water: H('#1c5a8a', '#2a78b0', '#3a98c8', '#7ccce6', '#e6fbff'),
  cliff: H('#3a1812', '#7a2e1e', '#a8442a', '#cc6238', '#ea8a52'),
  cliffTop: H('#b0603a', '#cc7a48', '#e0965c', '#f0b476'),
  tree: H('#2a2a12', '#5a5a22', '#7c7a30', '#a09a44', '#c8be66'),
  pine: H('#2a1e1a', '#58443a', '#7e6656', '#a48a74', '#cdb49a'),
  blossom: H('#5a2a2e', '#a84e4a', '#d6785e', '#f0a07a', '#ffd0a8'),
  trunk: H('#2e1a10', '#5a3420', '#7a4a2c', '#9a6440'),
  bush: H('#3a2a10', '#6e5a24', '#948232', '#bca84a', '#dcc86e'),
  fence: H('#3a2014', '#704226', '#94603a', '#b88054'),
  flowers: H('#ffcf4a', '#ff7a4a', '#fff0c8'),
  ledge: H('#5a2414', '#9a4a2c', '#b8603a', '#f0b478'),
  strata: H('#fbe4bc', '#f2c08c', '#df965c', '#c56c3e', '#a24a2c', '#76301f', '#4c1c16'),
  cactus: H('#1c3222', '#2e5a34', '#447e44', '#68a254', '#a2c870'),
  pad: H('#2a3a18', '#4e6a2a', '#6e8c36', '#9cb452'),
}

const GALLERY: Pal = {
  ...CITY,
  field: H('#51434b', '#806f76', '#b2a4a1', '#d8cbb9', '#fff2cf'),
  paved: H('#817979', '#aaa3a0', '#d7d0c4', '#eee6d7', '#fff7e5'),
  flowers: H('#ffe8a0', '#fff5d4'),
}

export const PALS: Record<Theme, Pal> = { town: TOWN, meadow: MEADOW, city: CITY, canyon: CANYON, gallery: GALLERY }

/** Base blue (#0052FF) ramp for crypto accents. */
export const BASE = H('#001a66', '#0036b0', '#0052ff', '#3d7eff', '#8cb4ff', '#d6e4ff')
export const OUT = hex('#1a1222')
