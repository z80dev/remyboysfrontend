# QBasic DOS screen

Shared by Remy Gorillas (`SCREEN 9`, 640×350) and Remy Nibbles (80×25 text cells, 640×400). Import from `../qbasic`. The original-authored bitmap font and 16-colour renderer have no network dependency.

- `EGA`: immutable 16-colour DOS palette; `nearestEga(hex)` quantizes Remy palette colours.
- `drawChar(ctx, char, x, y, fg=15, bg?)`, `drawText(ctx, text, x, y, fg=15, bg?)`: integer-pixel drawing. Newlines advance 16 px.
- `locate(ctx, row, col, text, fg=15, bg?)`: 1-based DOS coordinates.
- `clearScreen(ctx, bg=0, width=640, height=400)`.
- `drawBox(ctx, col, row, width, height, fg=15, bg=4)`: box-drawn text-cell frame.
- `drawHalfCells(ctx, cells)`: 4,000 colour indexes, zero-based row-major 80×50 cells; each logical cell is 8×8 px.
- `drawSparkles(ctx, frame, rows=25, fg=14, bg=1)`: marching perimeter stars; advance frame at a modest cadence only while intro is visible.
- `createInput(maxLength=32, value='')`, `editInput(input,key,allow?)`: immutable INPUT line editing returning `{input,submitted,cancelled,handled}`. Empty Enter is submitted; the caller applies defaults.
- `drawInput(ctx,input,col,row,elapsedMs,fg=15,bg=1)`: LOCATE input and 16-on/16-off underscore cursor.
- `cursorVisible(elapsedMs)` is independently testable.
- `parseMml(source)`: pure PLAY interpreter, returning `{notes,duration,background}`; supports T O L < > N P MF MB MN ML MS, accidentals, note lengths and dotted rhythms.
- `playMml(source)`: cancellable 50%-duty square-wave voice through the kit master. Returns `{stop,done,duration,background}`. MF callers can await `done`; MB callers continue immediately. Call `stop()` on inactivity, dialog, program transition and unmount. Hidden documents automatically stop playback. No audio nodes are created while muted.

Games use kit canvas/lifecycle hooks, draw `C:\REMYOS>QBASIC /RUN <FILE>.BAS` for 600 ms with skippable input, and own their screen-state transitions. Shared CSS provides `qbasic-client`, `qbasic-letterbox`, `qbasic-touch-controls` and `qbasic-live`. The game menu stays outside the letterbox. Desktop surfaces are 1×; Pocket uses the largest fitting integer scale, then fractional fit below 1×, without smoothing.

Tests: `bun test tests/games/qbasic.test.ts` covers glyph repertoire, block geometry, palette, line editing, cursor timing and PLAY note semantics.
