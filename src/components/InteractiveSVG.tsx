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
  idleVisible?: boolean;
}

export const InteractiveSVG: React.FC<InteractiveSVGProps> = ({
  zones, selectedZoneId, hoveredZoneId, onZoneClick, onZoneHover,
  mapHoverOpacity = 0.35, mapSelectedOpacity = 0.55, mapIdleOpacity = 0.15,
  mapStrokeWidth = 6, forceHighlight = false,
  colorYellow = DEFAULT_COLORS.yellow, colorGreen = DEFAULT_COLORS.purple,
  idleVisible = true,
}) => {
  const colorMap: Record<string, string> = { yellow: colorYellow, purple: colorGreen };
  return (
    <>
      {zones.map((zone) => {
        const isSelected = zone.id === selectedZoneId;
        const isHovered = forceHighlight || zone.id === hoveredZoneId;
        const isActive = isSelected || isHovered;
        const fill = colorMap[zone.color] ?? zone.color;

        const fillOpacity = isSelected ? 0.55 : isHovered ? 0.65 : idleVisible ? 0.28 : 0;
        const strokeOpacity = isActive ? 1 : idleVisible ? 0.75 : 0;
        const strokeWidth = isSelected ? 5 : isHovered ? 4 : 2;

        return (zone.polygons ?? []).map((poly, pi) => (
          <polygon
            key={`${zone.id}-${pi}`}
            points={poly.points.map((p) => `${p[0]},${p[1]}`).join(' ')}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={fill}
            strokeWidth={strokeWidth}
            strokeOpacity={strokeOpacity}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            onMouseEnter={() => onZoneHover(zone.id)}
            onMouseLeave={() => onZoneHover(null)}
            onClick={() => onZoneClick(zone.id)}
            style={{ transition: 'fill-opacity 0.2s ease, stroke-opacity 0.2s ease', cursor: 'pointer' }}
          />
        ));
      })}
    </>
  );
};
