import React from 'react';
import type { GameZone } from '../data/zones';

interface ZoneInfoProps {
  zone: GameZone;
}

function PolygonPreview({ zone }: { zone: GameZone }) {
  const pts = zone.polygon.points;
  const xs = pts.map(p => p[0]);
  const ys = pts.map(p => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 30;
  const viewBox = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
  const pointsStr = pts.map(p => `${p[0]},${p[1]}`).join(' ');
  const color = zone.color === 'yellow' ? '#FFC107' : '#9C27B0';

  return (
    <svg
      viewBox={viewBox}
      style={{ width: '100%', maxHeight: '140px', display: 'block', marginBottom: '16px' }}
    >
      <polygon
        points={pointsStr}
        fill={color}
        fillOpacity={0.25}
        stroke={color}
        strokeWidth={25}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const ZoneInfo: React.FC<ZoneInfoProps> = ({ zone }) => {
  const titleColor = zone.color === 'yellow' ? '#FFC107' : '#9C27B0';

  return (
    <div>
      <h2 style={{ color: titleColor, marginBottom: '12px', fontSize: '24px' }}>
        {zone.name}
      </h2>
      <PolygonPreview zone={zone} />
      <p style={{ marginBottom: '10px', lineHeight: '1.6' }}>
        <strong>Počet hráčů:</strong> {zone.players}
      </p>
      <p style={{ lineHeight: '1.6' }}>
        <strong>Popis:</strong> {zone.description}
      </p>
    </div>
  );
};
