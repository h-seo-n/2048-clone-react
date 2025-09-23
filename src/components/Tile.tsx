import React from 'react';

type TileProps = {
  r: number;
  c: number;
  value: number;
  isNew: boolean;
  isMerged: boolean;
};

export const Tile = ({ r, c, value, isNew, isMerged }: TileProps) => {
  if (value === 0) return null;
  // grid placement by CSS class
  const style: React.CSSProperties = {
    gridRowStart: r + 1,
    gridColumnStart: c + 1,
  };
  const extra = [isNew ? 'tile--new' : '', isMerged ? 'tile--merged' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={`tile tile-${value} ${extra}`}
      style={style}
      aria-label={`${value}`}
    >
      <div className="tile-inner">{value}</div>
    </div>
  );
};
