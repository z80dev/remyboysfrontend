import { LEVEL_TEXT } from '../strings'
import { Tile, index, type Level } from '../types'
import { buildLevel } from './build'
import { CHALLENGE_LEGEND } from './legend'

// Original designs 21–30. Each recorded character is one 100 ms engine tick.
export const THIRD: readonly Level[] = [
  buildLevel({
    ...LEVEL_TEXT[20],
    time: 150,
    rows: [
      '#####################',
      '#@?.................#',
      '#..QQQ...QQQ...QQQ..#',
      '#..Q$Q...QAQ.6.q$Q..#',
      '#..QqQ...QQQ...QQQ..#',
      '#......I.....I......#',
      '#..H...IK....I...H..#',
      '#..QQQ...QqQ...QQQ..#',
      '#..Q$q.4.Q$Q...QJQ..#',
      '#..QQQ...QQQ...QQQ..#',
      '#.2...I.......I...5O#',
      '#$................HX#',
      '#####################'
    ],
    legend: {
      ...CHALLENGE_LEGEND,
      A: { kind: 'bug', dir: 0 },
      K: { kind: 'bug', dir: 3 },
      J: { kind: 'fireball', dir: 0 }
    },
    offset: [0, 0],
    solution: 'EESSSSSSSSEEEENNNNSSSSEEEENNEEEESSEEEEEEEENNEEEENNEEEEWWWWSSWWWWSSWWWWSSWWWWSSWWWWSSWWWWEEEE....NNNNNNNNEEEESSEEEE............SSSSSSNNNNNNSSWWWWSSSSSSSSSSWWWWWWWWWWWWWWEEEEEEEEEEEEEEEEEEEEEEEEEEEENNEEEEEENNEESSSS'
  }),
  buildLevel({
    ...LEVEL_TEXT[21],
    time: 120,
    rows: [
      '######################',
      '#####$####n####$######',
      '#####K####.####K######',
      '#####.####.####.######',
      '#####.####.####.######',
      '#####.####.####.######',
      '#u@?........u....T.OX#',
      '#####.####....#.######',
      '#####.####.####.######',
      '#####.####.####.######',
      '#####.####L####.######',
      '#####$####$####$######',
      '######################'
    ],
    legend: {
      ...CHALLENGE_LEGEND,
      K: { kind: 'tank', dir: 0 },
      L: { kind: 'tank', dir: 2 }
    },
    traps: [
      { button: index(10, 1), target: index(17, 6) }
    ],
    offset: [0, 0],
    solution: 'EEEEEESSSSSSSSSSNNNNNNNNNNEEEEEEEEEEEESSEEEENNEEEESSSSSSSSSSNNNNNNNNNNWWWWSSWWWWNNWWWWWWWWWWWWWWWWWWWW....................EEEEEEEENNNNNNNNNNSSSSSSSSSSEEEEEEEEEESSSSSSSSSSNNNNNNNNEEEEEENNEEEENNNNNNNNNNSSSSSSSSSSEEEEEEEEEE'
  }),
  buildLevel({
    ...LEVEL_TEXT[22],
    time: 150,
    rows: [
      '##########X##########',
      '#$.......#O#.......$#',
      '#...Z....#,#....S...#',
      '#..##....#,#....##..#',
      '#..#.....#,#.....#..#',
      '#.....$...,...$.....#',
      '#..,,.....,.....,,..#',
      '#..#.....#,#.....#..#',
      '#..##....#,#....##..#',
      '#.$.......,.......$.#',
      '#.........?.........#',
      '##########@##########',
      '#####################'
    ],
    legend: {
      ...CHALLENGE_LEGEND,
      S: { kind: 'teeth', dir: 2 },
      Z: { kind: 'teeth', dir: 2 }
    },
    offset: [0, 0],
    solution: 'NNNNNNNNNNNNNNNNSSSSWWWWWWWWEEEEEEEESSSSSSSSEEEENNEENNNNNNEESSSSSSSSWWWWWWWWWWWWWWWWWWWWWWWWNNNNNNEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEESSSSSSNNNNSSSSWWWWWWWWWWWWWWWWWWWWNNWWNNNNNNNNNNNNNNWWWWWWWWWWWWEEEEEEEEEEEEEESSSSSSSSEEEESSSSSSSSEEEENNEENNNNNNNNNNNNNNEEEEEEEEEEEEWWWWWWWWWWSSSSSSSSWWWWWWWWNNNNNNNNNN'
  }),
  buildLevel({
    ...LEVEL_TEXT[23],
    time: 120,
    rows: [
      '####################',
      '#@?.w..$w..$w..$#..#',
      '#.t.#...#...#...a..#',
      '#...#.t.j...w...#..#',
      '#.t.#...#...#...j#O#',
      '#$..#..$w...j$..##X#',
      '####################'
    ],
    legend: CHALLENGE_LEGEND,
    offset: [0, 0],
    solution: 'SSSSSSSSNNNNNNEENNEEEEEEEEEESSSSSSSSNNNNWWEEEEEENNNNEEEESSSSSSSSEEEENNNNNNNNEEEESSEEEEEESSSSSS'
  }),
  buildLevel({
    ...LEVEL_TEXT[24],
    time: 150,
    rows: [
      '#####################',
      '#@.##################',
      '#.dG~~~~~~~~~~~~!.$##',
      '#.f..################',
      '#..##################',
      '#.dG~~~~~~!~~~~~!.$##',
      '#....################',
      '#$.##################',
      '#.dG~~~~~~~~~~~~~~~##',
      '#....#############~##',
      '#..###############!##',
      '#.?###############$##',
      '#O###################',
      '#X###################',
      '#####################'
    ],
    legend: {
      ...CHALLENGE_LEGEND,
      G: { tile: Tile.Clone, kind: 'glider', dir: 1 }
    },
    cloners: [
      { button: index(2, 2), target: index(3, 2) },
      { button: index(2, 5), target: index(3, 5) },
      { button: index(2, 8), target: index(3, 8) }
    ],
    offset: [0, 0],
    solution: 'SSSSEENNSSEEEENNEEEEEEEEEEEEEEEEEEEEEEEEEEEEWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSWWWWSSSSSSEEEEWWWWNNSSEEEENNEEEEEEEEEEEEEEEEEEEEEEEEEEEEWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSWWWWSSSSSSEEEENNEEEEEEEEEEEEEEEEEEEEEEEEEEEESSSSSSNNNNNNWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSWWWWWWNNNNSSSSSSSSSSSS'
  }),
  buildLevel({
    ...LEVEL_TEXT[25],
    time: 120,
    rows: [
      '###############',
      '#@?.#t.$#t.$###',
      '#...a.t.<...###',
      '#$..#...#...###',
      '##p###v###p####',
      '#...#...#$..###',
      '#.$.<.t.a...wOX',
      '#...#$..#.t.###',
      '###############'
    ],
    legend: CHALLENGE_LEGEND,
    offset: [0, 0],
    solution: 'EEEESSEEEEEESSSS.SEEEEEENNEENNNNNNNNEESSWWWWWW.NSSSSWWSS.WSSSSNNWW.WNNNNNNWWNNEEEEEEEEEESSSS.SEEEEEEEESSNNEEEEEEEE'
  }),
  buildLevel({
    ...LEVEL_TEXT[26],
    time: 150,
    rows: [
      '#####################',
      '#$........#........$#',
      '#.....Z...#...S.....#',
      '#...................#',
      '#...................#',
      '####.............####',
      '#?T...............T,#',
      '#.##.............##.#',
      '#...................#',
      '#$.......$@$.......$#',
      '##########n##########',
      '##########.##########',
      '##########O##########',
      '##########X##########',
      '#####################'
    ],
    legend: {
      ...CHALLENGE_LEGEND,
      S: { kind: 'teeth', dir: 2 },
      Z: { kind: 'teeth', dir: 2 }
    },
    traps: [
      { button: index(10, 10), target: index(2, 6) },
      { button: index(10, 10), target: index(18, 6) }
    ],
    offset: [0, 0],
    solution: 'NNNNSSWWWWWWWWWWWWWWNNWWNNWWNNNNSSSSEEEEEENNEEEEEEEENNEENNEEEEEENNEEEEEEEESSSSSSSSEENNEENNEENNNNSSSSWWWWWWNNNNNNNNNNWWWWWWWWWWWWWWNNNNWWWWWWWWWWWWWWWWEEEEEEEEEEEEEEEESSSSEEEENNNNEEEEEEEEEEEEEEEESSSSSSWWWWWWSSSSSSSSEEEEEESSWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWEEEEEEEEEEEEEEEEEESSSSSSSS'
  }),
  buildLevel({
    ...LEVEL_TEXT[27],
    time: 75,
    rows: [
      '#####################',
      '#@?...$.........$...#',
      '#.#######.###.#######',
      '#....I#HH.HH#....I###',
      '#III.I#...HH#III.I###',
      '#I...I#.HHHH#I...I###',
      '#I.III#.....#I.III###',
      '#I...$#HHH$.#I...OX##',
      '#####################'
    ],
    legend: CHALLENGE_LEGEND,
    offset: [0, 0],
    solution: 'EEEEEEEEEEWWWWWWWWWWSSSSEEEEEESSSSWWWWSSSSEEEEEEWWWWWWNNNNEEEENNNNWWWWWWNNNNEEEEEEEEEEEEEEEESSSSSSWWWWSSSSEEEEEEEESSWWNNWWWWWWNNNNEEEENNNNNNEEEEEEEEEEEEEEWWWWWWSSSSEEEEEESSSSWWWWSSSSEEEEEEEE'
  }),
  buildLevel({
    ...LEVEL_TEXT[28],
    time: 150,
    rows: [
      '#################',
      '#@..Q...Q.Z.Q..$#',
      '#?..q.$.Q...Q...#',
      '#...Q...q...Q...#',
      '#QqQQQQqQQQqQQqQ#',
      '#...Q...Q...q..Q#',
      '#.$.q.S.Q.$.Q.OX#',
      '#...Q...Q...Q..Q#',
      '#################'
    ],
    legend: {
      ...CHALLENGE_LEGEND,
      S: { kind: 'teeth', dir: 2 },
      Z: { kind: 'teeth', dir: 2 }
    },
    offset: [0, 0],
    solution: 'EEEESSEEEEEEWWWWWWSSWWSSSSSSNNNNNNNNEEEEEEEEEESSEEWWNNEEWWWWEEEESSEEEEEEEESSSSSSWWNNEEEEEEEENNNNNNNNEESSSSWWSSSSSSEE'
  }),
  buildLevel({
    ...LEVEL_TEXT[29],
    time: 200,
    seed: 30,
    rows: [
      '#######################',
      '#.......$.#@#.$.......#',
      '#.Z.......#?#.......S.#',
      '#..##.....,,,.....##..#',
      '#..#......#,#......#..#',
      '#....$....#,#....$....#',
      '#..#......#,#......#..#',
      '#..##.....,,,.....##..#',
      '#.........#,#.........#',
      '#$........#,#........$#',
      '###########,###########',
      '#$....................#',
      '#....B.....B.....B....#',
      '#....................O#',
      '#####################X#',
      '#######################'
    ],
    legend: {
      ...CHALLENGE_LEGEND,
      S: { kind: 'teeth', dir: 2 },
      Z: { kind: 'teeth', dir: 2 },
      B: { kind: 'blob', dir: 2 }
    },
    offset: [0, 0],
    solution: 'SSSSWWWWNNNNWWWWWWWWSSSSSSSSSSSSSSSSWWWWWWWWNNEEEEEEEENNEEEEEEEEEEEENNNNNNNNEEEENNNNEEEEEEEESSSSSSSSEEEEEEEESSSSSSSSNNWWWWWWWWWWNNWWWWWWWWWWSSSSSS........SSWWWWWWWWWWWWWWWWWWWWNNEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEESSSSSS'
  })
]
