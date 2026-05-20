import React from 'react';
import { InteractiveSVG } from './InteractiveSVG';

// Natural dimensions of hriste1_web.png (2400x1525)
const IMG_W = 2400;
const IMG_H = 1525;

interface PlayAreaProps {
  selectedZoneId: string | null;
  hoveredZoneId: string | null;
  onZoneClick: (zoneId: string) => void;
  onZoneHover: (zoneId: string | null) => void;
}

export const PlayArea: React.FC<PlayAreaProps> = ({
  selectedZoneId,
  hoveredZoneId,
  onZoneClick,
  onZoneHover,
}) => {
  return (
    <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
      <img
        src="/hriste1_web.png"
        alt="Multifunkční hřiště"
        style={{ width: '80vw', maxWidth: '1400px', display: 'block' }}
      />
      <svg
        viewBox={`0 0 ${IMG_W} ${IMG_H}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: 'pointer',
        }}
      >
        <InteractiveSVG
          selectedZoneId={selectedZoneId}
          hoveredZoneId={hoveredZoneId}
          onZoneClick={onZoneClick}
          onZoneHover={onZoneHover}
        />
      </svg>
    </div>
  );
};
