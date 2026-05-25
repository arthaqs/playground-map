import React from 'react';
import type { GameZone } from '../data/zones';

export interface ModalCfg {
  bgOpacity: number;
  blurDivisor: number;
  blurRatioY: number;
  strokeOpacity: number;
  strokeWidthDiv: number;
  strokeColor: string;
  strokeSmoothing: number;
}

export const DEFAULT_MODAL_CFG: ModalCfg = {
  bgOpacity: 0.3,
  blurDivisor: 10,
  blurRatioY: 1,
  strokeOpacity: 0.5,
  strokeWidthDiv: 140,
  strokeColor: 'auto',
  strokeSmoothing: 1,
};

function formatPlayers(players: number | string): string {
  if (players === 0 || players === '0' || players === '') return 'Neomezeno';
  return String(players);
}

const IMG_W = 2400;
const IMG_H = 1525;
const PAD = 90;

const COLOR_MAP: Record<string, string> = {
  yellow: '#E8A540',
  purple: '#4A7C59',
};

function smoothPath(pts: [number, number][], smoothing = 1): string {
  const n = pts.length;
  if (n < 3) return '';
  const t = smoothing * 0.5;
  const lerp = (a: [number, number], b: [number, number], s: number): [number, number] =>
    [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];
  const getMid = (i: number) => lerp(pts[i], pts[(i + 1) % n], t === 0 ? 0 : t);
  const m0 = getMid(n - 1);
  let d = `M ${m0[0]},${m0[1]}`;
  for (let i = 0; i < n; i++) {
    const cp = pts[i];
    const ep = getMid(i);
    if (smoothing === 0) {
      d += ` L ${cp[0]},${cp[1]}`;
    } else {
      d += ` Q ${cp[0]},${cp[1]} ${ep[0]},${ep[1]}`;
    }
  }
  return d + ' Z';
}

function MapCrop({ zone, cfg = DEFAULT_MODAL_CFG }: { zone: GameZone; cfg?: ModalCfg }) {
  const allPts = (zone.polygons ?? []).flatMap(p => p.points);
  if (allPts.length === 0) return null;

  const xs = allPts.map(p => p[0]);
  const ys = allPts.map(p => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bboxX = Math.max(0, minX - PAD);
  const bboxY = Math.max(0, minY - PAD);
  const bboxW = Math.min(IMG_W - bboxX, maxX - minX + PAD * 2);
  const bboxH = Math.min(IMG_H - bboxY, maxY - minY + PAD * 2);

  const bboxDiag = Math.sqrt(bboxW * bboxW + bboxH * bboxH);
  const blurEdge = Math.round(Math.max(10, Math.min(80, bboxDiag / cfg.blurDivisor)));
  const strokeWidth = Math.max(1.5, Math.min(8, bboxDiag / cfg.strokeWidthDiv));

  const color = COLOR_MAP[zone.color] ?? zone.color;
  const maskId = `mask-${zone.id}`;
  const sharpFilterId = `fsharp-${zone.id}`;

  return (
    <svg
      viewBox={`${bboxX} ${bboxY} ${bboxW} ${bboxH}`}
      style={{ width: '100%', display: 'block', marginBottom: '20px' }}
    >
      <defs>
        <filter id={sharpFilterId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={`${blurEdge} ${Math.round(blurEdge * cfg.blurRatioY)}`} />
        </filter>
        <mask id={maskId}>
          <rect x={0} y={0} width={IMG_W} height={IMG_H} fill="black" />
          {(zone.polygons ?? []).map((poly, i) => (
            <path key={i} d={smoothPath(poly.points, cfg.strokeSmoothing)} fill="white" filter={`url(#${sharpFilterId})`} />
          ))}
        </mask>
      </defs>

      {/* Full dimmed background */}
      <image href="/hriste1_web.png" x={0} y={0} width={IMG_W} height={IMG_H} opacity={cfg.bgOpacity} />
      {/* Bright polygon — soft rounded edges */}
      <image href="/hriste1_web.png" x={0} y={0} width={IMG_W} height={IMG_H} mask={`url(#${maskId})`} />
      {/* Smooth outline */}
      {(zone.polygons ?? []).map((poly, i) => (
        <path
          key={i}
          d={smoothPath(poly.points, cfg.strokeSmoothing)}
          fill="none"
          stroke={cfg.strokeColor === 'auto' ? color : cfg.strokeColor}
          strokeWidth={strokeWidth}
          opacity={cfg.strokeOpacity}
        />
      ))}
    </svg>
  );
}

export const ZoneInfo: React.FC<{ zone: GameZone; cfg?: ModalCfg }> = ({ zone, cfg }) => {
  const color = COLOR_MAP[zone.color] ?? zone.color;

  return (
    <div>
      <p style={{
        fontSize: '10px',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: '8px',
        fontWeight: 500,
      }}>
        Herní zóna
      </p>
      <h2 style={{
        color,
        marginBottom: '20px',
        fontSize: '28px',
        fontWeight: 700,
        letterSpacing: '-0.02em',
      }}>
        {zone.name}
      </h2>
      <MapCrop zone={zone} cfg={cfg} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius)',
          fontSize: '14px',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Počet hráčů</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {formatPlayers(zone.players) === 'Neomezeno' ? '∞ Neomezeno' : `${formatPlayers(zone.players)} hráčů`}
          </span>
        </div>
        {zone.description && (
          <p style={{ fontSize: '14px', lineHeight: '1.65', color: 'var(--text-muted)', padding: '2px 0' }}>
            {zone.description}
          </p>
        )}
      </div>
    </div>
  );
};
