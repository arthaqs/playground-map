import React from 'react';
import type { GameZone } from '../data/zones';

const DEFAULT_COLORS: Record<string, string> = {
  yellow: '#E8A540',
  purple: '#4A7C59',
};

interface InteractiveSVGProps {
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

export const InteractiveSVG: React.FC<InteractiveSVGProps> = ({
  zones, selectedZoneId, hoveredZoneId, onZoneClick, onZoneHover,
  mapHoverOpacity = 0.35, mapSelectedOpacity = 0.55, mapIdleOpacity = 0.15,
  mapStrokeWidth = 6, forceHighlight = false,
  colorYellow = DEFAULT_COLORS.yellow, colorGreen = DEFAULT_COLORS.purple,
}) => {
  const colorMap: Record<string, string> = { yellow: colorYellow, purple: colorGreen };
  return (
    <>
      {zones.map((zone) => {
        const isSelected = zone.id === selectedZoneId;
        const isHovered = forceHighlight || zone.id === hoveredZoneId;
        const fill = colorMap[zone.color] ?? zone.color;
        const opacity = isSelected ? mapSelectedOpacity : isHovered ? mapHoverOpacity : mapIdleOpacity;

        return (zone.polygons ?? []).map((poly, pi) => (
          <polygon
            key={`${zone.id}-${pi}`}
            points={poly.points.map((p) => `${p[0]},${p[1]}`).join(' ')}
            fill={fill}
            opacity={opacity}
            stroke={isSelected || isHovered ? fill : 'none'}
            strokeWidth={isSelected ? mapStrokeWidth + 4 : isHovered ? mapStrokeWidth : 0}
            strokeLinejoin="round"
            onMouseEnter={() => onZoneHover(zone.id)}
            onMouseLeave={() => onZoneHover(null)}
            onClick={() => onZoneClick(zone.id)}
            style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
          />
        ));
      })}
    </>
  );
};
