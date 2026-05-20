import React from 'react';
import { InteractiveSVG } from './InteractiveSVG';
import type { GameZone } from '../data/zones';

const IMG_W = 2400;
const IMG_H = 1525;

// Crop to inner edge of green frame (pixel-scanned)
// Green frame: left x=525–605, top y=73–142, bottom y=1398–1498, right x=2373–2375
const CROP_X = 606;
const CROP_Y = 143;
const CROP_W = 1648;  // → x=2254 (black border ends ~x=2259, green starts x=2260)
const CROP_H = 1255;  // → y=1398 (right at green frame start)

interface PlayAreaProps {
  zones: GameZone[];
  selectedZoneId: string | null;
  hoveredZoneId: string | null;
  onZoneClick: (zoneId: string) => void;
  onZoneHover: (zoneId: string | null) => void;
  mapHoverOpacity?: number;
  mapSelectedOpacity?: number;
  mapIdleOpacity?: number;
  mapStrokeWidth?: number;
  forceHighlight?: boolean;
  colorYellow?: string;
  colorGreen?: string;
}

export const PlayArea: React.FC<PlayAreaProps> = ({
  zones, selectedZoneId, hoveredZoneId, onZoneClick, onZoneHover,
  mapHoverOpacity, mapSelectedOpacity, mapIdleOpacity, mapStrokeWidth, forceHighlight,
  colorYellow, colorGreen,
}) => {
  return (
    <svg
      viewBox={`${CROP_X} ${CROP_Y} ${CROP_W} ${CROP_H}`}
      style={{ width: 'min(95vw, 1100px)', display: 'block' }}
    >
      <image href="/hriste1_web.png" x={0} y={0} width={IMG_W} height={IMG_H} />
      <InteractiveSVG
        zones={zones}
        selectedZoneId={selectedZoneId}
        hoveredZoneId={hoveredZoneId}
        onZoneClick={onZoneClick}
        onZoneHover={onZoneHover}
        mapHoverOpacity={mapHoverOpacity}
        mapSelectedOpacity={mapSelectedOpacity}
        mapIdleOpacity={mapIdleOpacity}
        mapStrokeWidth={mapStrokeWidth}
        forceHighlight={forceHighlight}
        colorYellow={colorYellow}
        colorGreen={colorGreen}
      />
    </svg>
  );
};
