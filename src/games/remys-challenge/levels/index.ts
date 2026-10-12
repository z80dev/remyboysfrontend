import type { Level } from '../types'
import { FIRST } from './first'
import { SECOND } from './second'
import { THIRD } from './third'
import { FOURTH } from './fourth'

export const LEVELS: readonly Level[] = [...FIRST, ...SECOND, ...THIRD, ...FOURTH]
