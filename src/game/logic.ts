import { type Coords, type Dir, type Effects, type Grid, SIZE } from './types';

// Create empty SIZE * SIZE grid
export function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneGrid(g: Grid): Grid {
  return g.map((row) => row.slice());
}

function getEmptyCells(g: Grid) {
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] == 0) cells.push({ r, c });
    }
  }
  return cells;
}

export function spawnRandomTile(g: Grid): { grid: Grid; spawned?: Coords } {
  const empty = getEmptyCells(g);
  // there should be empty space to put the tiles
  if (empty.length === 0) return { grid: g };
  // random position - by randomly indexing empty cells
  const spot = empty[Math.floor(Math.random() * empty.length)];

  // tile value - 90%로 2, 10%로 4
  const value = Math.random() < 0.9 ? 2 : 4;

  // insert new tile in new grid, return new grid
  const nextGrid = cloneGrid(g);
  nextGrid[spot.r][spot.c] = value;
  return { grid: nextGrid, spawned: spot };
}

// core swipe-and-merge rule
// takes line (row _ for right→/left←, col | for ↑↓up/down) <- think of addition directions!
// default : left, up
function slideAndMerge(line: number[]): {
  result: number[];
  scoreDelta: number;
  moved: boolean;
  mergedIdx: number[];
} {
  // make an array of nonZero tiles in row/col
  const nonZero = line.filter((n) => n !== 0);
  const merged: number[] = [];
  const mergedIdx: number[] = []; // for animations
  let scoreDelta = 0;

  // iterate through the nonZero tiles (duh)
  for (let i = 0; i < nonZero.length; i++) {
    // merge condition
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const val = nonZero[i] * 2; // merged tile has double value;
      merged.push(val); // push merged value to i'th index
      mergedIdx.push(merged.length - 1);
      scoreDelta += val;
      i++; // skip next(merged)
    } else {
      // push original value if not merge
      merged.push(nonZero[i]);
    }
  }
  // pad with 0 in empty space -- default : left, up
  while (merged.length < SIZE) merged.push(0);

  const moved = !arraysEqual(line, merged);
  return { result: merged, scoreDelta, moved, mergedIdx };
}

function arraysEqual(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// process turn -> replace row/col with merged row/col
export function move(
  grid: Grid,
  dir: Dir
): { grid: Grid; moved: boolean; scoreDelta: number; effects: Effects } {
  let moved = false; // indicates if any tile changed position
  let scoreDelta = 0; // points gained from merging tiles
  const nextGrid = cloneGrid(grid); // new grid to return
  const effects: Effects = { newTiles: [], mergedTiles: [] };

  // helper : get - merge - set | takes care of reverse logic in case of down/right
  const applyLine = (
    _r: number, // index of row/column being moved
    getLine: () => number[], // extracts r'th row/col from grid
    setLine: (values: number[]) => void, // updates grid with new line
    mapIndexToCoords: (i: number) => { r: number; c: number },
    reversed: boolean //  whether to process line in reverse (reverse : Right, Down - get line in reverse, merge, then reverse the output again)
  ) => {
    const raw = getLine(); // gets current row/col with getLine
    const line = reversed ? [...raw].reverse() : raw;
    const {
      result,
      scoreDelta: delta,
      moved: lineMoved,
      mergedIdx,
    } = slideAndMerge(line);

    const finalLine = reversed ? [...result].reverse() : result;
    setLine(finalLine);
    if (lineMoved) moved = true;
    scoreDelta += delta;

    mergedIdx.forEach((idx) => {
      const pos = reversed ? SIZE - 1 - idx : idx;
      effects.mergedTiles.push(mapIndexToCoords(pos));
    });
  };

  switch (dir) {
    case 'Left':
      for (let r = 0; r < SIZE; r++) {
        applyLine(
          r,
          () => nextGrid[r], // get original r'th row
          (values) => {
            nextGrid[r] = values;
          }, // set next r'th row
          (i) => ({ r, c: i }),
          false
        );
      }
      break;
    case 'Right':
      for (let r = 0; r < SIZE; r++) {
        applyLine(
          r,
          () => nextGrid[r],
          (values) => {
            nextGrid[r] = values;
          },
          (i) => ({ r, c: i }),
          true
        );
      }
      break;
    case 'Up':
      for (let c = 0; c < SIZE; c++) {
        applyLine(
          c,
          () => nextGrid.map((row) => row[c]), // get column by getting c'th elem from each row
          (values) => {
            for (let r = 0; r < SIZE; r++) {
              nextGrid[r][c] = values[r];
            }
          },
          (i) => ({ r: i, c }),
          false
        );
      }
      break;
    case 'Down':
      for (let c = 0; c < SIZE; c++) {
        applyLine(
          c,
          () => nextGrid.map((row) => row[c]),
          (values) => {
            for (let r = 0; r < SIZE; r++) {
              nextGrid[r][c] = values[r];
            }
          },
          (i) => ({ r: i, c }),
          true
        );
      }
      break;
  }
  return { grid: nextGrid, moved, scoreDelta, effects };
}

export function hasMoves(grid: Grid): boolean {
  if (getEmptyCells(grid).length > 0) return true;
  // check for adjacent equal pairs
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const val = grid[r][c];
      if (r + 1 < SIZE && grid[r + 1][c] == val) return true;
      if (c + 1 < SIZE && grid[r][c + 1] == val) return true;
    }
  }
  return false;
}

export function maxTile(grid: Grid): number {
  let m = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] > m) m = grid[r][c];
    }
  }
  return m;
}
