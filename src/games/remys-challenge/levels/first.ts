import { LEVEL_TEXT } from '../strings'
import { Tile, index, type Level } from '../types'
import { buildLevel, LEGEND } from './build'
import { CHALLENGE_LEGEND } from './legend'

// Original designs 1–10, with 100ms tick-exact solutions replayed through the MS rules engine.
export const FIRST: readonly Level[] = [
  buildLevel({
    ...LEVEL_TEXT[0],
    number: 1,
    time: 0,
    rows: [
      '###############',
      '#$....###....$#',
      '#.##.......##.#',
      '#.#..#####..#.#',
      '#....#.X.#....#',
      '##.#.##O##.#.##',
      '#......?......#',
      '#.##.##@##.##.#',
      '#$.#.......#.$#',
      '###############'
    ],
    legend: { ...LEGEND, ...CHALLENGE_LEGEND },
    offset: [0, 0],
    solution: 'NNWWWWWWNNNNNNNNNNWWWWWWEEEEEEEESSEEEEEEEENNEEEEEEEESSSSSSWWSSSSEESSSSNNNNWWWWWWWWWWWWWWWWWWWWWWWWSSSSNNNNEEEEEEEEEEEENNNN'
  }),
  buildLevel({
    ...LEVEL_TEXT[1],
    number: 2,
    time: 150,
    rows: [
      '###################',
      '#$.....#.....#...$#',
      '#.@.?..B..r..R..g.#',
      '#b.....#.....#....#',
      '###G#####G#######G#',
      '#$..#$.....$#.....#',
      '#.y.#...$...#.###Y#',
      '#...#$.....$#$#XO.#',
      '###################'
    ],
    legend: { ...LEGEND, ...CHALLENGE_LEGEND },
    offset: [0, 0],
    solution: 'EEEESSWWWWWWNNNNEEEEEEEEEESSEEEEEEEEEEEEEEEEEEEENNEESSWWWWWWWWWWWWWWWWWWWWWWSSWWWWWWSSSSWWWWEESSNNEENNNNNNEEEEEEEEEEEESSSSSSWWWWWWWWEEEEEESSSSWWWWWWEEEEEEEEEEEENNNNWWWWNNNNNNEEEEEEEEEEEEEEEESSSSSSWWWWWWWWSSSSNNNNEEEEEEEESSSSWWWW'
  }),
  buildLevel({
    ...LEVEL_TEXT[2],
    number: 3,
    time: 120,
    rows: [
      '#####################',
      '#.....#~~~~~~~#****$#',
      '#.@.?.#~$~~~h~#*$**##',
      '#.....~~~~~~~~#***OX#',
      '#..f..#~~~$~~~*****##',
      '#.....#~~~~~~~#*$***#',
      '#####################'
    ],
    legend: { ...LEGEND, ...CHALLENGE_LEGEND },
    offset: [0, 0],
    solution: 'EEEESSSSWWNNEEEEEEEENNEEEEEEEEEESSSSWWWWEEEEEEEEEENNNNEENNEEEEEEWWSSWWSSSSSSWWNNNNEEEEEE'
  }),
  buildLevel({
    ...LEVEL_TEXT[3],
    number: 4,
    time: 150,
    rows: [
      '####################',
      '#$..#.....~...#...$#',
      '#.@.#.+...~..$#....#',
      '#.?.......~...+....#',
      '#...#.+...~...#..$.#',
      '##+##.....~...######',
      '#...#.....~.+.~..OX#',
      '#$..#######...######',
      '####################'
    ],
    legend: { ...LEGEND, ...CHALLENGE_LEGEND },
    offset: [0, 0],
    solution: 'SSSSSSSSWWSSNNEENNNNNNNNNNWWEEEESSSSEEEENNEEEEEEEEEEEEEEEESSEEEENNNNEEEEEESSSSSSWWWWWWNNWWWWSSSSWWWWSSEEEEEEEEEEEEEE'
  }),
  buildLevel({
    ...LEVEL_TEXT[4],
    number: 5,
    time: 120,
    rows: [
      '#########################',
      '#####$____9##############',
      '##########_##############',
      '#.@.?_____3#__$___$___###',
      '#...########__________OX#',
      '#...########____$_____###',
      '#...########______$___###',
      '#..........__________i###',
      '#...########$_________###',
      '#########################'
    ],
    legend: { ...LEGEND, ...CHALLENGE_LEGEND },
    offset: [0, 0],
    solution: 'EEEEEE............EE............WWSSSSSSSSEEEEEEEEEEEEEEEE..........NNNNNNNNWWWWWWWWWWWWWWEEEEEEEESSSSWWWWEEEESSSSSSWWWWWWWWWWWWNNNNNNNNEEEEEEEEEEEEEEEEEEEEEE'
  }),
  buildLevel({
    ...LEVEL_TEXT[5],
    number: 6,
    time: 100,
    rows: [
      '####################',
      '#......#$##$##$#####',
      '#.@.?..#.##.##.#...#',
      '#......>>>>>>>>>...#',
      '#......#########...#',
      '#################v##',
      '#################v##',
      '#################v##',
      '################..$#',
      '#$..>>>>>>>>>>>>...#',
      '#O.$############..s#',
      '#X##################',
      '####################'
    ],
    legend: { ...LEGEND, ...CHALLENGE_LEGEND },
    offset: [0, 0],
    solution: 'EEEEEEEESSEENNNNSSSS...NNNSSSS...NNNSSSS..EESSSS...ESSSSNNWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWEEEESSWWWWSS'
  }),
  buildLevel({
    ...LEVEL_TEXT[6],
    number: 7,
    time: 150,
    rows: [
      '###################',
      '#.....#.....#..E..#',
      '#.#$#.#.###.#.###.#',
      '#A###.#.$#$D#.$##.#',
      '#.#$#.#.###.#.#$#.#',
      '#.....#.....#.....#',
      '#.#######.#######.#',
      '#@?...............#',
      '#########O#########',
      '#########X#########',
      '###################'
    ],
    legend: { ...LEGEND, ...CHALLENGE_LEGEND, A: { kind: 'bug', dir: 2 }, D: { kind: 'bug', dir: 0 }, E: { kind: 'bug', dir: 3 } },
    offset: [0, 0],
    solution: 'EEWWNNNNEEEENNSSEEEENNNNNNNNWWWWSSNNWWWWSSSSSSSSSSSSEEEEEEEEEEEEEEEENNNNEEEENNNNWWEENNNNWWWWWWWWSSSSEEWWSSSSEEEESSSSEEEEEEEEEEEEEEEENNNNNNNNNNNNWWWWWWWWSSSSEEWWSSSSEEEENNSSEEEESSSSWWWWWWWWWWWWWWWWSSSS'
  }),
  buildLevel({
    ...LEVEL_TEXT[7],
    number: 8,
    time: 150,
    rows: [
      '############################',
      '#@?..$###$####.L.~...$######',
      '#.....###w####...~....######',
      '#.....#......#...~....######',
      '#..+..T......a...~....K..OX#',
      '#.....#......#...~...#.#####',
      '#..n..#....t.#d..~...#.#####',
      '#$....#$.....#..$~$u.#.#####',
      '############################'
    ],
    legend: { ...LEGEND, ...CHALLENGE_LEGEND, L: { tile: Tile.Clone, kind: 'block', dir: 2 }, K: { kind: 'tank', dir: 0 } },
    offset: [0, 0],
    traps: [{ button: index(3, 6), target: index(6, 4) }],
    cloners: [{ button: index(14, 6), target: index(15, 1) }],
    solution: 'EEEEEEEESSSSSSSSSSSSWWWWWWWWNNNNNNNNEEEESSSSNNEEEEEEEESSSSSSNNEEEEEEEENNNNNNWWWWNNNNSSSSEEEESSSSSSNNNNEEEEEEEEEESSSSSSNNWWWWNNNNNNNNEEEEEEEENNEEEEEESSSSSSWWSSSSWWWWSSEENNNNNNEEEEEEEEEEEEEE'
  }),
  buildLevel({
    ...LEVEL_TEXT[8],
    number: 9,
    time: 200,
    rows: [
      '######################',
      '#@,?,,,,,,,,,,,,,,,,##',
      '#,A....,D....,A....,##',
      '#,..$..,.....,.$...,##',
      '#,.....,..$..,.....,##',
      '#,.....,.....,.....,##',
      '#,,,,,,,,,,,,,,,,,,,##',
      '#,D....,A....,D....,##',
      '#,.....,.$...,.....,##',
      '#,...$.,.....,..$..,##',
      '#,.....,....E,.....,##',
      '#,,,,,,,,,,,,,,,,,,,OX',
      '######################'
    ],
    legend: { ...LEGEND, ...CHALLENGE_LEGEND, A: { kind: 'bug', dir: 1 }, D: { kind: 'paramecium', dir: 2 }, E: { kind: 'bug', dir: 3 } },
    offset: [0, 0],
    solution: 'EEEEEESSSSNNNNEEEEEESSSSSSSSSSEEEEEE....NNNNSSSSEEEEEENNNNNNNNNNEEEESSSSNNNNSSSSSSWWSSSSWWSSSSSSSSSSWWWWWWWWWWWWWWWWNNNNSSSSEEEENNNNNNNNNNEEEE..SSSSNNNNEEEEEEEESSSSSSSSSSEEEEEE....NNNNSSSSEEEEEEEEEE'
  }),
  buildLevel({
    ...LEVEL_TEXT[9],
    number: 10,
    time: 250,
    rows: [
      '#######################',
      '#$....##...X...##....$#',
      '#.....##.......##.....#',
      '#....r##.......##y....#',
      '##p#B######O######p#R##',
      '#$....................#',
      '#..........?..........#',
      '#..........@..........#',
      '#..........b..........#',
      '#....................$#',
      '##p#Y######.######p#G##',
      '#.....##~~~~~~~##.....#',
      '#..$..##~$~~~$~##..$..#',
      '#g....##~~~~~~~##....f#',
      '#######################'
    ],
    legend: { ...LEGEND, ...CHALLENGE_LEGEND },
    offset: [0, 0],
    solution: 'NNSSSSNNNNNNWWWWWWWWWWWWWWWWWWWWEENNNNEEEEEENNNNWWWWWWWWEEEEEESSSSSSSSEEEEEEEEEEEEEEEEEEEEEEEEEEEENNNNWWNNNNEEEEEEEESSSSWWSSSSEESSSSSSSSWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSSSSSSSWWNNEEEENNEENNNNEEEEEEEEEEEEEEEEEEEEEEEEEEEESSSSEEEEEESSSSNNWWWWNNEENNNNWWWWWWWWWWWWWWWWWWSSSSSSWWWWEEEEEEEENNWWWWNNNNNNNNNNNNNNNNNNNN'
  })
]
