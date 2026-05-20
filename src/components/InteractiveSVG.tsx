import React from 'react';
import { ZONES } from '../data/zones';

interface InteractiveSVGProps {
  selectedZoneId: string | null;
  hoveredZoneId: string | null;
  onZoneClick: (zoneId: string) => void;
  onZoneHover: (zoneId: string | null) => void;
}

export const InteractiveSVG: React.FC<InteractiveSVGProps> = ({
  selectedZoneId,
  hoveredZoneId,
  onZoneClick,
  onZoneHover,
}) => {
  return (
    <>
      {ZONES.map((zone) => {
        const isSelected = zone.id === selectedZoneId;
        const isHovered = zone.id === hoveredZoneId;
        const fillColor = zone.color === 'yellow' ? '#FFC107' : '#9C27B0';
        const opacity = isSelected ? 0.5 : isHovered ? 0.3 : 0.1;

        return (
          <polygon
            key={zone.id}
            points={zone.polygon.points.map((p) => `${p[0]},${p[1]}`).join(' ')}
            fill={fillColor}
            opacity={opacity}
            stroke={isSelected ? '#000' : 'none'}
            strokeWidth={isSelected ? 3 : 0}
            onMouseEnter={() => onZoneHover(zone.id)}
            onMouseLeave={() => onZoneHover(null)}
            onClick={() => onZoneClick(zone.id)}
            style={{
              transition: 'opacity 0.2s ease, stroke 0.2s ease',
            }}
          />
        );
      })}
    </>
  );
};
