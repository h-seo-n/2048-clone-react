import React from 'react';
import { Tile } from './components/Tile';
import {
  emptyGrid,
  hasMoves,
  maxTile,
  move,
  spawnRandomTile,
} from './game/logic';
import {
  type Dir,
  type Effects,
  type GameStatus,
  type Grid,
  SIZE,
  type SaveState,
} from './game/types';
import './styles.css';

const LS_KEY = 'react-2048sy-state';
const WIN_THRESHOLD = 128;
const HISTORY_LIMIT = 50;

function loadState(): SaveState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveState;
    // shape check
    if (!Array.isArray(parsed.grid) || parsed.grid.length !== SIZE) return null;
    return parsed;
  } catch {
    return null;
  }
}
function saveState(s: SaveState) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

export default function App() {
  // effects for animations
  const [effects, setEffects] = React.useState<Effects>({
    newTiles: [],
    mergedTiles: [],
  });

  const [grid, setGrid] = React.useState<Grid>(() => {
    const saved = loadState();
    if (saved) return saved.grid;

    let g = emptyGrid();
    // generate two tiles
    g = spawnRandomTile(g).grid;
    g = spawnRandomTile(g).grid;
    return g;
  });

  const [score, setScore] = React.useState<number>(
    () => loadState()?.score ?? 0
  );
  const [best, setBest] = React.useState<number>(() => {
    const saved = loadState();
    if (saved) return saved.best;
    const bestVal = Number(localStorage.getItem('best-2048') ?? 0);
    return isNaN(bestVal) ? 0 : bestVal;
  });
  const [status, setStatus] = React.useState<GameStatus>(
    () => loadState()?.status ?? 'Playing'
  );

  // history for two undo option
  const [history, setHistory] = React.useState<SaveState['history']>(
    () => loadState()?.history ?? []
  );

  // persist any relevant change
  React.useEffect(() => {
    const snapshot: SaveState = { grid, score, best, status, history };
    saveState(snapshot);
    localStorage.setItem('best-2048', String(best));
  }, [grid, score, best, status, history]);

  // const [message, setMessage] = React.useState<string | null>(null);

  const onKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (status === 'Won' || status === 'Over') return;

      let dir: Dir | null = null;
      switch (e.key) {
        case 'ArrowLeft':
          dir = 'Left';
          break;
        case 'ArrowRight':
          dir = 'Right';
          break;
        case 'ArrowUp':
          dir = 'Up';
          break;
        case 'ArrowDown':
          dir = 'Down';
          break;
        default:
          return;
      }
      e.preventDefault();

      // for undo : snapshot before move
      setHistory((h) => {
        const next = [
          ...h,
          { grid: grid.map((r) => r.slice()), score, status },
        ];
        return next.slice(-HISTORY_LIMIT);
      });

      // move
      const {
        grid: movedGrid,
        moved,
        scoreDelta,
        effects: moveEffects,
      } = move(grid, dir);
      if (!moved) {
        // nothing to undo, remove pushed snapshot
        setHistory((h) => h.slice(0, -1));
        return;
      }

      // spawn
      const { grid: gridWithSpawn, spawned } = spawnRandomTile(movedGrid);

      // update effects
      const newEffects: Effects = {
        mergedTiles: moveEffects.mergedTiles,
        newTiles: spawned ? [spawned] : [],
      };
      setEffects(newEffects);
      window.setTimeout(
        () => setEffects({ newTiles: [], mergedTiles: [] }),
        180
      );

      // score + best
      setScore((score) => {
        const nextScore = score + scoreDelta;
        // best variable from useCallback dependency array
        if (nextScore > best) setBest(nextScore);
        return nextScore;
      });

      // status change
      const hit = maxTile(gridWithSpawn) >= WIN_THRESHOLD;
      setStatus((curr) => {
        if (curr === 'Playing' && hit) return 'Won';
        return curr;
      });

      if (!hasMoves(gridWithSpawn)) {
        // setMessage('Game Over');
        setStatus('Over');
      }

      setGrid(gridWithSpawn);
    },
    [grid, score, best, status]
  );

  React.useEffect(() => {
    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  const restart = () => {
    let g = emptyGrid();
    g = spawnRandomTile(g).grid;
    g = spawnRandomTile(g).grid;
    setGrid(g);
    setScore(0);
    setStatus('Playing');
    setHistory([]);
    setEffects({ newTiles: [], mergedTiles: [] });
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setGrid(prev.grid);
      setScore(prev.score);
      setStatus(prev.status);
      setEffects({ newTiles: [], mergedTiles: [] });
      return h.slice(0, -1);
    });
  };

  // Undo to start (pop all)
  // const undoAll = () => {
  //   setHistory(h => {
  //     if (h.length === 0) return h;
  //     const first = h[0];
  //     setGrid(first.grid);
  //     setScore(first.score);
  //     setStatus(first.status);
  //     setEffects({ newTiles: [], mergedTiles: [] });
  //     return [];
  //   });
  // };

  const keepPlaying = () => setStatus('Continue');

  return (
    <div className="app">
      <header className="header-flex-row">
        <div className="score-best-container">
          <div className="score-container">Score {score}</div>
          <div className="best-container">Best {best}</div>
        </div>
        <div className="restart-container">
          <button
            onClick={undo}
            aria-label="undo"
            disabled={history.length === 0}
          >
            Undo
          </button>
          <button onClick={restart} aria-label="restart">
            Restart
          </button>
        </div>
      </header>

      <div className="game-container">
        {/* for WINNERS */}
        {status === 'Won' && (
          <div className="game-message" role="dialog" aria-live="polite">
            <p>🎉 You made {WIN_THRESHOLD}! 🥳</p>
            <div className="restart-container">
              <button onClick={keepPlaying}>Keep playing</button>
              <button onClick={restart}>Restart</button>
            </div>
          </div>
        )}

        {/* for GAME OVER */}
        {status === 'Over' && (
          <div className="game-message" role="alert">
            <p>Game Over</p>
            <button onClick={restart}>Try again</button>
          </div>
        )}

        {/*Background grid*/}
        <div className="grid-container">
          {Array.from({ length: SIZE * SIZE }).map((_, i) => (
            <div key={i} className="grid-cell" />
          ))}

          {/*Dynamic tiles with animation flags*/}
          {grid.map((row, r) =>
            row.map((v, c) => {
              const isNew = effects.newTiles.some(
                (t) => t.r === r && t.c === c
              );
              const isMerged = effects.mergedTiles.some(
                (t) => t.r === r && t.c === c
              );
              return (
                <Tile
                  key={`${r}-${c}-${v}`}
                  r={r}
                  c={c}
                  value={v}
                  isNew={isNew}
                  isMerged={isMerged}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
