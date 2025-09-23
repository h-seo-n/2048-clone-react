export type Grid = number[][];
export type Coords = { r: number; c: number };
export type Dir = 'Left' | 'Right' | 'Up' | 'Down';
export const SIZE = 4;

export type GameStatus = 'Playing' | 'Won' | 'Over' | 'Continue';

export type Effects = {
  newTiles: Coords[];
  mergedTiles: Coords[];
};

export type SaveState = {
  grid: Grid;
  score: number;
  best: number;
  status: GameStatus;
  history: { grid: Grid; score: number; status: GameStatus }[];
};
